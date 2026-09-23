// Contrato de las columnas del CSV del catálogo.
//
// POR QUÉ ESTE ARCHIVO: exportar e importar tienen que ser la misma cosa en los
// dos sentidos. Si el exportador tuviera su lista de columnas y el importador
// otra, alcanzaría con que alguien renombrara una para que un archivo bajado de
// la propia tienda dejara de poder subirse. Acá está la única lista: el
// exportador escribe `header` y el importador acepta cualquiera de los `aliases`.
//
// Los alias existen porque el archivo puede venir de otro lado (un Excel del
// proveedor, una exportación de Tienda Nube) y no tiene por qué usar
// exactamente nuestros nombres. El orden de las columnas nunca importa.

export type ColumnSpec = {
  readonly key: string;
  readonly header: string;
  readonly aliases: readonly string[];
};

export const CATEGORY_COLUMNS = [
  { key: "name", header: "nombre", aliases: ["nombre", "name"] },
  { key: "slug", header: "slug", aliases: ["slug"] },
  {
    key: "parentSlug",
    header: "categoria_padre",
    aliases: ["categoria_padre", "categoria padre", "categoría padre", "parent", "parent_slug"],
  },
  {
    key: "description",
    header: "descripcion",
    aliases: ["descripcion", "descripción", "description"],
  },
  { key: "position", header: "orden", aliases: ["orden", "position"] },
  { key: "isActive", header: "activa", aliases: ["activa", "activo", "active", "isactive"] },
] as const satisfies readonly ColumnSpec[];

export const PRODUCT_COLUMNS = [
  { key: "slug", header: "slug", aliases: ["slug"] },
  { key: "name", header: "nombre", aliases: ["nombre", "name", "producto"] },
  {
    key: "categorySlug",
    header: "categoria",
    aliases: ["categoria", "categoría", "category", "rubro"],
  },
  { key: "brand", header: "marca", aliases: ["marca", "brand"] },
  { key: "summary", header: "resumen", aliases: ["resumen", "bajada", "summary"] },
  {
    key: "description",
    header: "descripcion",
    aliases: ["descripcion", "descripción", "description"],
  },
  { key: "isActive", header: "activo", aliases: ["activo", "activa", "active"] },
  { key: "isFeatured", header: "destacado", aliases: ["destacado", "featured"] },
  { key: "variantName", header: "variante", aliases: ["variante", "variant", "color", "talle"] },
  { key: "sku", header: "sku", aliases: ["sku", "codigo", "código"] },
  { key: "price", header: "precio", aliases: ["precio", "price"] },
  {
    key: "compareAtPrice",
    header: "precio_anterior",
    aliases: ["precio_anterior", "precio anterior", "precio_tachado", "compare_at_price"],
  },
  { key: "stock", header: "stock", aliases: ["stock", "cantidad"] },
  {
    key: "variantActive",
    header: "variante_activa",
    aliases: ["variante_activa", "variante activa"],
  },
  { key: "images", header: "imagenes", aliases: ["imagenes", "imágenes", "fotos", "images"] },
  { key: "metaTitle", header: "meta_titulo", aliases: ["meta_titulo", "meta título", "meta_title"] },
  {
    key: "metaDescription",
    header: "meta_descripcion",
    aliases: ["meta_descripcion", "meta descripción", "meta_description"],
  },
] as const satisfies readonly ColumnSpec[];

export const CATEGORY_CSV_HEADER = CATEGORY_COLUMNS.map((c) => c.header);
export const PRODUCT_CSV_HEADER = PRODUCT_COLUMNS.map((c) => c.header);

/** Varias fotos en una sola celda. Las URLs no llevan espacios, así que no hay ambigüedad. */
export const IMAGE_SEPARATOR = " | ";

/**
 * Posición de cada columna en el archivo, o -1 si no está. Devuelve las claves
 * tipadas, así un error de tipeo en el nombre de una columna no compila.
 */
export function columnIndexes<T extends readonly ColumnSpec[]>(
  header: string[],
  columns: T,
): Record<T[number]["key"], number> {
  const normalizado = header.map((h) => h.trim().toLowerCase());
  const indices = {} as Record<T[number]["key"], number>;
  for (const col of columns) {
    indices[col.key as T[number]["key"]] = normalizado.findIndex((h) =>
      col.aliases.includes(h),
    );
  }
  return indices;
}

/** Celda de una fila, o "" si esa columna no existe en el archivo. */
export function cell(row: string[], index: number): string {
  return index === -1 ? "" : (row[index]?.trim() ?? "");
}

// Todo lo que no diga explícitamente "no" se toma como activo: en una planilla
// llenada a mano es más común dejar la celda vacía que escribir "sí".
export function parseActiveFlag(value: string): boolean {
  return !["no", "0", "false", "inactiva", "inactivo"].includes(value.trim().toLowerCase());
}

/** Lo que escribe el exportador, y que parseActiveFlag vuelve a leer igual. */
export function formatFlag(value: boolean): string {
  return value ? "si" : "no";
}

/**
 * Arma una fila a partir de un objeto con las claves de las columnas.
 *
 * El exportador lo usa en vez de escribir un array posicional: asi el orden de
 * las celdas sale de la MISMA lista que lee el importador, y agregar, sacar o
 * mover una columna no puede dejar los valores corridos respecto de la cabecera.
 */
export function rowFromValues<T extends readonly ColumnSpec[]>(
  columns: T,
  values: Record<T[number]["key"], string>,
): string[] {
  return columns.map((c) => values[c.key as T[number]["key"]] ?? "");
}
