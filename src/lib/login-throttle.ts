import "server-only";

// Freno de fuerza bruta para el login del panel.
//
// POR QUÉ: el panel va a quedar expuesto en internet cuando la tienda pase a su
// dominio propio, y bcrypt solo encarece cada intento — no limita cuántos se
// pueden hacer. Sin esto, nada impide probar contraseñas de a miles.
//
// POR QUÉ EN MEMORIA Y NO EN LA BASE: el proceso es uno solo, así que un Map
// alcanza y sobra. No necesita migración, no ensucia el modelo de datos y no
// escribe en Postgres en cada intento fallido (que es justo lo que un ataque
// querría provocar). Se pierde al reiniciar el contenedor, y está bien: un
// atacante no puede reiniciarlo.
//
// POR CUENTA Y NO POR IP: todo entra por Cloudflare, así que la IP que ve el
// server es la del nodo de Cloudflare, no la del visitante. Limitar por ahí
// castigaría a gente legítima que comparte nodo.

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 15 * 60_000;
// Los fallos viejos no cuentan: quien se equivoca una vez por mes no se bloquea.
const VENTANA_MS = 15 * 60_000;

type Registro = { fallos: number; ultimoFallo: number; bloqueadoHasta: number };

const registros = new Map<string, Registro>();

function normalizar(email: string): string {
  return email.trim().toLowerCase();
}

// Se corren las entradas vencidas de a poco, aprovechando que ya estamos acá.
// El Map no puede crecer sin techo aunque alguien pruebe con mil emails.
function limpiarVencidos(ahora: number) {
  for (const [clave, reg] of registros) {
    if (reg.bloqueadoHasta < ahora && ahora - reg.ultimoFallo > VENTANA_MS) {
      registros.delete(clave);
    }
  }
}

/** Milisegundos que faltan para poder reintentar, o 0 si no está bloqueada. */
export function bloqueoRestante(email: string): number {
  const reg = registros.get(normalizar(email));
  if (!reg) return 0;
  return Math.max(0, reg.bloqueadoHasta - Date.now());
}

export function registrarFallo(email: string): void {
  const ahora = Date.now();
  limpiarVencidos(ahora);

  const clave = normalizar(email);
  const reg = registros.get(clave);

  // Primer fallo, o el anterior quedó fuera de la ventana: se arranca de cero.
  if (!reg || ahora - reg.ultimoFallo > VENTANA_MS) {
    registros.set(clave, { fallos: 1, ultimoFallo: ahora, bloqueadoHasta: 0 });
    return;
  }

  reg.fallos += 1;
  reg.ultimoFallo = ahora;
  if (reg.fallos >= MAX_INTENTOS) {
    reg.bloqueadoHasta = ahora + BLOQUEO_MS;
    reg.fallos = 0;
  }
}

export function limpiarFallos(email: string): void {
  registros.delete(normalizar(email));
}

/** "15 minutos" / "1 minuto", para el mensaje que ve la persona. */
export function minutosRestantes(ms: number): string {
  const minutos = Math.max(1, Math.ceil(ms / 60_000));
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}
