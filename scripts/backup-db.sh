#!/bin/sh
# Backup de la base de la tienda, con rotacion abuelo-padre-hijo.
#
#   diarios    uno por dia
#   semanales  el domingo, el dump del dia pasa a semanal y se limpian los diarios
#   mensuales  al llegar a 4 semanales, el mas nuevo pasa a mensual y se limpian
#
# Se corre por cron todos los dias. Ver /etc/cron.d/libreria-fusion-backup
#
# RESTAURAR (ojo: pisa la base actual):
#   gunzip -c /opt/libreria-fusion/backups/diarios/fusion-AAAA-MM-DD.sql.gz \
#     | docker exec -i fusion-prod-db psql -U fusion -d fusion
#
# COPIA AFUERA: al final, los dumps y las fotos subidas se copian a Cloudflare
# R2 (bucket R2_BUCKET, credenciales R2_* en el .env). Asi un VPS muerto no se
# lleva todo. Si R2 falla queda anotado en el log, pero el backup local ya
# esta hecho y no se toca.
#
# RESTAURAR DESDE R2 (en un server nuevo, con las mismas variables R2_*):
#   docker run --rm -v "$PWD:/data" <mismas RCLONE_CONFIG_R2_* que abajo> #     rclone/rclone copy r2:$R2_BUCKET/db /data/backups
#   y las fotos: ... copy r2:$R2_BUCKET/fotos <volumen de uploads>

set -eu

RAIZ=/opt/libreria-fusion
DESTINO="$RAIZ/backups"
DIARIOS="$DESTINO/diarios"
SEMANALES="$DESTINO/semanales"
MENSUALES="$DESTINO/mensuales"
REGISTRO="$DESTINO/backup.log"

MAX_SEMANALES=4
MAX_MENSUALES=12

# Credenciales de la base, del mismo .env que usa el compose.
. "$RAIZ/.env"

mkdir -p "$DIARIOS" "$SEMANALES" "$MENSUALES"
chmod 700 "$DESTINO"

# FECHA_SIMULADA existe solo para probar la rotacion sin esperar semanas.
HOY=${FECHA_SIMULADA:-$(date +%Y-%m-%d)}
ARCHIVO="$DIARIOS/fusion-$HOY.sql.gz"

decir() {
  echo "$(date '+%Y-%m-%d %H:%M:%S')  $1" >> "$REGISTRO"
}

# Se escribe a .parcial y recien al final se renombra: si el proceso se corta a
# la mitad, no queda un archivo con nombre de backup bueno que en realidad esta
# cortado.
docker exec fusion-prod-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  | gzip > "$ARCHIVO.parcial"

# Un dump que no descomprime, o al que le falta el marcador final que escribe
# pg_dump, no sirve. Mejor fallar ahora y conservar los de ayer que rotar
# encima de un archivo roto: el peor backup es el que parece estar y no esta.
if ! gzip -t "$ARCHIVO.parcial" 2>/dev/null; then
  rm -f "$ARCHIVO.parcial"
  decir "ERROR: el dump no descomprime. No se roto nada."
  exit 1
fi
if ! gunzip -c "$ARCHIVO.parcial" | tail -5 | grep -q "PostgreSQL database dump complete"; then
  rm -f "$ARCHIVO.parcial"
  decir "ERROR: el dump quedo incompleto. No se roto nada."
  exit 1
fi

mv "$ARCHIVO.parcial" "$ARCHIVO"
chmod 600 "$ARCHIVO"
decir "diario ok: $(basename "$ARCHIVO") ($(du -h "$ARCHIVO" | cut -f1))"

# --- domingo: el del dia pasa a semanal y se limpian los diarios -------------
if [ "$(date -d "$HOY" +%u)" = "7" ]; then
  cp "$ARCHIVO" "$SEMANALES/fusion-semana-$HOY.sql.gz"
  chmod 600 "$SEMANALES/fusion-semana-$HOY.sql.gz"
  rm -f "$DIARIOS"/*.sql.gz
  decir "domingo: promovido a semanal y limpiados los diarios"
fi

# --- 4 semanales: el mas nuevo pasa a mensual y se limpian los semanales -----
CANT_SEMANALES=$(find "$SEMANALES" -name '*.sql.gz' | wc -l)
if [ "$CANT_SEMANALES" -ge "$MAX_SEMANALES" ]; then
  ULTIMO=$(find "$SEMANALES" -name '*.sql.gz' | sort | tail -1)
  cp "$ULTIMO" "$MENSUALES/fusion-mes-$HOY.sql.gz"
  chmod 600 "$MENSUALES/fusion-mes-$HOY.sql.gz"
  rm -f "$SEMANALES"/*.sql.gz
  decir "$CANT_SEMANALES semanales: promovido a mensual y limpiados los semanales"
fi

# --- techo de mensuales, para que no crezca sin fin -------------------------
SOBRAN=$(find "$MENSUALES" -name '*.sql.gz' | sort | head -n "-$MAX_MENSUALES" || true)
if [ -n "$SOBRAN" ]; then
  echo "$SOBRAN" | xargs rm -f
  decir "borrados mensuales viejos (se guardan $MAX_MENSUALES)"
fi

# --- copia afuera: Cloudflare R2 ---------------------------------------------
# rclone corre en un contenedor: no hay nada instalado en el server.
if [ -z "${R2_ENDPOINT:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
  decir "R2 no configurado: la copia queda solo en este disco"
  exit 0
fi

rclone() {
  docker run --rm     -e RCLONE_CONFIG_R2_TYPE=s3     -e RCLONE_CONFIG_R2_PROVIDER=Cloudflare     -e RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"     -e RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"     -e RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT"     -e RCLONE_CONFIG_R2_NO_CHECK_BUCKET=true     -v "$DESTINO:/backups:ro"     -v libreria-fusion_fusion_uploads:/fotos:ro     rclone/rclone:1.68 "$@"
}

# Dumps: copy y no sync. Que la rotacion borre un diario aca no lo borra en
# R2: alla se guardan todos un año (pesan ~25 KB cada uno).
if rclone copy /backups "r2:$R2_BUCKET/db" --include "*.sql.gz"   && rclone delete "r2:$R2_BUCKET/db" --min-age 400d; then
  decir "R2 ok: dumps copiados"
else
  decir "ERROR: no se pudieron copiar los dumps a R2"
fi

# Fotos: sync, pero lo que se borra en la tienda no desaparece de R2, se
# mueve a fotos-borradas/<fecha>. Una foto borrada por error se recupera.
if rclone sync /fotos "r2:$R2_BUCKET/fotos" --backup-dir "r2:$R2_BUCKET/fotos-borradas/$HOY"; then
  decir "R2 ok: fotos sincronizadas"
else
  decir "ERROR: no se pudieron copiar las fotos a R2"
fi
