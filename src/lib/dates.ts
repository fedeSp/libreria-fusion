// Fechas para exportar.
//
// El VPS corre en horario europeo, así que formatear con la zona del server
// haría que una venta de las 21:00 de un martes en Villa Bosch apareciera como
// del miércoles. La zona va fija a Buenos Aires: el que lee la planilla está
// acá, no donde esté alojada la máquina.

const formatoArgentino = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "23/09/2026 14:05". Vacío si no hay fecha. */
export function formatDateTimeForCsv(date: Date | null | undefined): string {
  if (!date) return "";
  return formatoArgentino.format(date).replace(", ", " ");
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
