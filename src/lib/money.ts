// Toda la plata circula en centavos (Int). Estas son las únicas funciones
// que traducen entre centavos y lo que ve o escribe una persona.

const formatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

/** 1090000 -> "$ 10.900,00" */
export function formatPrice(cents: number): string {
  return formatter.format(cents / 100);
}

/** "10900,50" | "10.900,50" | 10900.5 -> 1090050 */
export function parsePriceToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);

  const normalized = input
    .trim()
    .replace(/[^\d.,-]/g, "")
    // Formato argentino: el punto separa miles y la coma es el decimal.
    .replace(/\./g, "")
    .replace(",", ".");

  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new Error(`Precio inválido: ${input}`);
  }
  return Math.round(value * 100);
}

/** Cuotas sin interés, para mostrar debajo del precio. */
export function installment(cents: number, count: number): string {
  return formatPrice(Math.round(cents / count));
}
