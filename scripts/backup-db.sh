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
# LIMITACION QUE CONVIENE TENER PRESENTE: esto vive en el mismo disco que la
# base. Protege contra "se borro una tabla" o "una importacion salio mal", NO
# contra que se muera el VPS. Para eso hay que copiarlos afuera.

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
