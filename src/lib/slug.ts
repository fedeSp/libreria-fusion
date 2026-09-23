// Slugs: la URL pública de categorías y productos.

/** "Cuaderno Éxito E3" -> "cuaderno-exito-e3" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Agrega un sufijo hasta encontrar un slug libre. Recibe el chequeo de
 * existencia en vez de la tabla, porque cada modelo consulta la suya.
 */
export async function uniqueSlug(
  base: string,
  fallback: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = base || fallback;
  let slug = root;
  let n = 1;
  while (await exists(slug)) {
    slug = `${root}-${++n}`;
  }
  return slug;
}
