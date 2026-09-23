// Códigos de producto (SKU).
//
// FORMA: LAP-ESC-04-001
//        │   │   │   └─ número de variante: 001 es siempre la primera
//        │   │   └───── número de producto dentro de ese prefijo
//        │   └───────── tres letras de la categoría
//        └───────────── tres letras del nombre del producto
//
// POR QUÉ EL NÚMERO DE PRODUCTO: con solo las seis letras no alcanza. En una
// librería el primer sustantivo se repite muchísimo y los productos parecidos
// caen en la misma categoría, así que "Lapices FILGO x12" y "Lapices FILGO
// FLUO x8" darían los dos LAP-ESC. Medido sobre el catálogo real: 96 variantes
// colapsaban en 39 códigos. Como el SKU es único en toda la tienda, la mitad
// del catálogo no se habría podido guardar.
//
// POR QUÉ EL NÚMERO DE VARIANTE Y NO SUS LETRAS: "Verde claro" y "Verde
// oscuro" dan las dos VER.

const SIN_NOMBRE = "PRO";
const SIN_CATEGORIA = "GEN";

/** "Lápices de colores FILGO" -> "LAP". Sin acentos ni símbolos. */
function tresLetras(texto: string, siEstaVacio: string): string {
  const limpio = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  // Se rellena con X para que todos los códigos tengan el mismo largo y queden
  // alineados al leerlos en una planilla.
  return (limpio.slice(0, 3) || siEstaVacio).padEnd(3, "X");
}

/** "LAP-ESC": lo que comparten todas las variantes de un mismo producto. */
export function skuPrefix(productName: string, categoryName?: string | null): string {
  return `${tresLetras(productName, SIN_NOMBRE)}-${tresLetras(categoryName ?? "", SIN_CATEGORIA)}`;
}

/** "LAP-ESC" + producto 4 + variante 0 -> "LAP-ESC-04-001" */
export function buildSku(prefix: string, productNumber: number, variantIndex: number): string {
  const producto = String(productNumber).padStart(2, "0");
  const variante = String(variantIndex + 1).padStart(3, "0");
  return `${prefix}-${producto}-${variante}`;
}

/** De "LAP-ESC-04-001" saca el 4. null si el código no tiene esta forma. */
export function productNumberFromSku(sku: string, prefix: string): number | null {
  const match = new RegExp(`^${prefix}-(\\d+)-\\d+$`).exec(sku.trim().toUpperCase());
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * El próximo número libre para un prefijo. Toma el máximo usado y suma uno, en
 * vez de contar: así dar de baja un producto no libera su número para que otro
 * lo reutilice, que es lo que ensucia un historial.
 */
export function nextProductNumber(prefix: string, skusExistentes: string[]): number {
  const usados = skusExistentes
    .map((s) => productNumberFromSku(s, prefix))
    .filter((n): n is number => n !== null);
  return usados.length === 0 ? 1 : Math.max(...usados) + 1;
}
