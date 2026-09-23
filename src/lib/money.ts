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

  // Sin este chequeo, "abc" y "" se limpian hasta quedar en vacío, Number("")
  // da 0 y el producto termina valiendo cero sin que nadie se entere. Una celda
  // con basura tiene que fallar, no salir gratis.
  if (!/\d/.test(normalized)) {
    throw new Error(`Precio inválido: ${input}`);
  }

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

/**
 * Precio para una celda de CSV: "1090000" -> "10900,00".
 *
 * Sale en formato argentino a propósito, porque parsePriceToCents lee la coma
 * como decimal y el punto como separador de miles. Exportar "10900.00" haría
 * que al reimportar el archivo el precio se multiplique por cien.
 */
export function formatPriceForCsv(cents: number): string {
  const entero = Math.trunc(Math.abs(cents) / 100);
  const decimales = String(Math.abs(cents) % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}${entero},${decimales}`;
}
