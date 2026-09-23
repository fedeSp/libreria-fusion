import { parseCsv } from "@/lib/csv";
import { parsePriceToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { PRODUCT_COLUMNS, cell, columnIndexes, parseActiveFlag } from "@/lib/catalog-csv";

// Lectura del CSV de productos: de texto a una estructura lista para guardar.
//
// Vive separado de la accion de servidor porque no toca la base ni la sesion:
// es una funcion pura, y eso permite probarla contra la salida del exportador
// para comprobar que exportar e importar son la misma operacion al reves.
//
// FORMA DEL ARCHIVO: una fila por variante. Un producto con seis colores ocupa
// seis filas. Es el formato que exporta la tienda y el que usan las planillas
// de proveedores, y evita inventar una sintaxis rara para meter varias
// variantes en una celda.
//
// Las columnas del producto (nombre, categoria, descripcion, activo...) se leen
// de la PRIMERA fila de cada producto; las siguientes aportan solo su variante
// y sus fotos. Asi una planilla llena a mano, con el nombre escrito una sola
// vez y las demas filas solo con el color y el precio, se entiende igual - y
// una fila con "activo" vacio no le apaga el producto al que pertenece.

// Las fotos de una celda van separadas por "|", ";" o espacios. Ninguno de esos
// caracteres aparece en nuestras URLs, así que no hay forma de partir una al medio.
function splitImages(value: string): string[] {
  return value
    .split(/[\s|;]+/)
    .map((u) => u.trim())
    .filter(Boolean);
}

export type ProductCsvVariant = {
  line: number;
  name: string;
  sku: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  isActive: boolean;
};

export type ProductCsvItem = {
  line: number;
  slug: string;
  name: string;
  categorySlug: string;
  brand: string;
  summary: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: ProductCsvVariant[];
  images: string[];
};

export type ProductCsvPlan = {
  products: ProductCsvItem[];
  errors: { line: number; message: string }[];
};

export function planProductImport(csvText: string): ProductCsvPlan {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { products: [], errors: [{ line: 0, message: "El archivo está vacío." }] };
  }

  const col = columnIndexes(table[0], PRODUCT_COLUMNS);
  if (col.name === -1 && col.slug === -1) {
    return {
      products: [],
      errors: [{ line: 1, message: 'No se encontró ni la columna "nombre" ni "slug".' }],
    };
  }
  if (col.price === -1) {
    return {
      products: [],
      errors: [{ line: 1, message: 'No se encontró la columna "precio".' }],
    };
  }

  const products: ProductCsvItem[] = [];
  const porClave = new Map<string, ProductCsvItem>();
  const errors: { line: number; message: string }[] = [];
  // Productos de los que ya se avisó algo: sirve para no repetir al final
  // "no quedó ninguna variante" sobre uno del que ya se dijo por qué.
  const yaAvisados = new Set<ProductCsvItem>();
  let ultimo: ProductCsvItem | null = null;

  for (let i = 1; i < table.length; i++) {
    const raw = table[i];
    const line = i + 1;

    const slug = slugify(cell(raw, col.slug));
    const name = cell(raw, col.name);
    const destacado = cell(raw, col.isFeatured);
    const clave = slug || slugify(name);

    let item: ProductCsvItem | undefined;

    if (clave) {
      item = porClave.get(clave);
      if (!item) {
        if (!name) {
          errors.push({ line, message: "Falta el nombre del producto." });
          continue;
        }
        item = {
          line,
          slug,
          name,
          categorySlug: slugify(cell(raw, col.categorySlug)),
          brand: cell(raw, col.brand),
          summary: cell(raw, col.summary),
          description: cell(raw, col.description),
          metaTitle: cell(raw, col.metaTitle),
          metaDescription: cell(raw, col.metaDescription),
          isActive: parseActiveFlag(cell(raw, col.isActive)),
          // "activo" vacío significa activo, pero "destacado" vacío significa
          // NO destacado: nadie quiere que importar una planilla le llene la
          // home de productos destacados.
          isFeatured: destacado !== "" && parseActiveFlag(destacado),
          variants: [],
          images: [],
        };
        porClave.set(clave, item);
        products.push(item);
      }
    } else {
      // Fila sin nombre ni slug: es una variante más del producto anterior, que
      // es como se llena una planilla a mano.
      if (!ultimo) {
        errors.push({ line, message: "Falta el nombre del producto." });
        continue;
      }
      item = ultimo;
    }

    ultimo = item;

    for (const url of splitImages(cell(raw, col.images))) {
      if (!item.images.includes(url)) item.images.push(url);
    }

    const precioRaw = cell(raw, col.price);
    if (!precioRaw) {
      errors.push({ line, message: `"${item.name}": falta el precio.` });
      yaAvisados.add(item);
      continue;
    }

    let priceCents: number;
    let compareAtPriceCents: number | null = null;
    try {
      priceCents = parsePriceToCents(precioRaw);
      const anterior = cell(raw, col.compareAtPrice);
      if (anterior) compareAtPriceCents = parsePriceToCents(anterior);
    } catch {
      errors.push({ line, message: `"${item.name}": el precio "${precioRaw}" no es válido.` });
      yaAvisados.add(item);
      continue;
    }

    const stockRaw = cell(raw, col.stock);
    const stock = stockRaw ? Math.max(0, Math.floor(Number(stockRaw))) : 0;

    item.variants.push({
      line,
      // Un producto sin opciones igual necesita su variante: la convención del
      // proyecto es llamarla "Único".
      name: cell(raw, col.variantName) || "Único",
      sku: cell(raw, col.sku),
      priceCents,
      compareAtPriceCents,
      stock: Number.isFinite(stock) ? stock : 0,
      isActive: parseActiveFlag(cell(raw, col.variantActive)),
    });
  }

  for (const item of products) {
    if (item.variants.length === 0 && !yaAvisados.has(item)) {
      errors.push({ line: item.line, message: `"${item.name}": no quedó ninguna variante válida.` });
    }
  }

  return { products: products.filter((p) => p.variants.length > 0), errors };
}
