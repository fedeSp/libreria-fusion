// Fechas de la tienda, siempre en hora de Buenos Aires.
//
// POR QUÉ EXISTE ESTE ARCHIVO: el VPS corre en horario europeo y el contenedor
// en UTC. Formatear con la zona del runtime hace que una venta de las 21:00 de
// un martes en Villa Bosch aparezca como del miércoles — en la grilla, en el
// comprobante que se imprime, en el CSV y en el gráfico de ventas. Todo lo que
// muestre o agrupe fechas pasa por acá.

const TZ_AR = "America/Argentina/Buenos_Aires";

const fechaYHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_AR,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const soloFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: TZ_AR,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// en-CA da "2026-09-23", que es la forma que se ordena sola y la que usan las
// claves del gráfico de ventas.
const claveDeDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ_AR,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "23/09/2026 14:05". Vacío si no hay fecha. */
export function formatDateTimeAR(date: Date | null | undefined): string {
  if (!date) return "";
  return fechaYHora.format(date).replace(", ", " ");
}

/** "23/09/2026". Vacío si no hay fecha. */
export function formatDateAR(date: Date | null | undefined): string {
  if (!date) return "";
  return soloFecha.format(date);
}

/** "2026-09-23": el día al que pertenece ese instante acá, para agrupar. */
export function dayKeyAR(date: Date): string {
  return claveDeDia.format(date);
}

// Argentina no tiene horario de verano desde 2009, asi que el desfase es fijo.
// Escrito como offset y no como zona porque lo que hace falta aca es convertir
// una fecha suelta ("2026-09-01") en el instante exacto en que arranca ese dia
// en el local, y eso un Intl.DateTimeFormat no lo hace al reves.
const OFFSET_AR = "-03:00";

const SOLO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function instante(fecha: string | null, hora: string): Date | null {
  if (!fecha || !SOLO_FECHA.test(fecha)) return null;
  const d = new Date(`${fecha}T${hora}${OFFSET_AR}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-09-01" -> las 00:00 de ese dia en Buenos Aires. */
export function startOfDayAR(fecha: string | null): Date | null {
  return instante(fecha, "00:00:00.000");
}

/** "2026-09-30" -> el ultimo milisegundo de ese dia en Buenos Aires. */
export function endOfDayAR(fecha: string | null): Date | null {
  return instante(fecha, "23:59:59.999");
}
