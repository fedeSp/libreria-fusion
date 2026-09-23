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
