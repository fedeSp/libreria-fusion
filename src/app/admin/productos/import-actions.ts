"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/slug";
import { planProductImport, type ProductCsvPlan } from "@/lib/product-csv";

// Importacion de productos desde CSV. El parseo vive en lib/product-csv; aca
// queda solo lo que escribe en la base.

const FALLBACK_SLUG = "producto";

async function productSlugExists(slug: string): Promise<boolean> {
  return Boolean(await db.product.findUnique({ where: { slug }, select: { id: true } }));
}

/** Parsea y valida sin escribir nada, para ver qué va a pasar antes de confirmar. */
export async function previewProductImport(csvText: string): Promise<ProductCsvPlan> {
  await requireAdmin();
  return planProductImport(csvText);
}

export type ProductImportResult = {
  ok: boolean;
  error?: string;
  createdProducts?: number;
  updatedProducts?: number;
  createdVariants?: number;
  updatedVariants?: number;
  addedImages?: number;
  warnings?: string[];
};

export async function confirmProductImport(csvText: string): Promise<ProductImportResult> {
  await requireAdmin();

  const plan = planProductImport(csvText);
  if (plan.products.length === 0) {
    return { ok: false, error: plan.errors[0]?.message ?? "No hay productos válidos para importar." };
  }

  const warnings: string[] = [];
  let createdProducts = 0;
  let updatedProducts = 0;
  let createdVariants = 0;
  let updatedVariants = 0;
  let addedImages = 0;

  // Un archivo repite la misma categoría y la misma marca en decenas de filas.
  const categorias = new Map<string, string | null>();
  const marcas = new Map<string, string>();

  for (const item of plan.products) {
    let categoryId: string | null = null;
    if (item.categorySlug) {
      if (!categorias.has(item.categorySlug)) {
        const c = await db.category.findUnique({
          where: { slug: item.categorySlug },
          select: { id: true },
        });
        categorias.set(item.categorySlug, c?.id ?? null);
      }
      categoryId = categorias.get(item.categorySlug) ?? null;
      if (!categoryId) {
        warnings.push(
          `Fila ${item.line}: no existe la categoría "${item.categorySlug}". El producto se importó sin tocar su categoría.`,
        );
      }
    }

    // La marca se crea sola si no existe: frenar una importación de 200
    // productos porque falta cargar "Éxito" no le sirve a nadie.
    let brandId: string | null = null;
    if (item.brand) {
      const brandSlug = slugify(item.brand);
      if (!marcas.has(brandSlug)) {
        const existente = await db.brand.findUnique({
          where: { slug: brandSlug },
          select: { id: true },
        });
        const marca = existente ?? (await db.brand.create({ data: { name: item.brand, slug: brandSlug } }));
        marcas.set(brandSlug, marca.id);
      }
      brandId = marcas.get(brandSlug) ?? null;
    }

    const data: {
      name: string;
      summary: string | null;
      description: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
      isActive: boolean;
      isFeatured: boolean;
      categoryId?: string;
      brandId?: string;
    } = {
      name: item.name,
      summary: item.summary || null,
      description: item.description || null,
      metaTitle: item.metaTitle || null,
      metaDescription: item.metaDescription || null,
      isActive: item.isActive,
      isFeatured: item.isFeatured,
    };
    // Celda vacía = "no me meto", no "borrale la categoría". Un archivo parcial
    // no debería desclasificar productos sin que nadie lo haya pedido.
    if (categoryId) data.categoryId = categoryId;
    if (brandId) data.brandId = brandId;

    const existente = item.slug
      ? await db.product.findUnique({ where: { slug: item.slug }, select: { id: true } })
      : null;

    let productId: string;
    if (existente) {
      await db.product.update({ where: { id: existente.id }, data });
      productId = existente.id;
      updatedProducts++;
    } else {
      const slug = await uniqueSlug(item.slug || slugify(item.name), FALLBACK_SLUG, productSlugExists);
      const creado = await db.product.create({ data: { ...data, slug } });
      productId = creado.id;
      createdProducts++;
    }

    // --- variantes -----------------------------------------------------
    const actuales = await db.productVariant.findMany({
      where: { productId },
      orderBy: { position: "asc" },
    });

    for (const [i, v] of item.variants.entries()) {
      // Primero por SKU, que es el identificador de verdad; si no hay, por
      // nombre, que es lo único que tiene una planilla llena a mano.
      const match =
        (v.sku ? actuales.find((c) => c.sku === v.sku) : undefined) ??
        actuales.find((c) => c.name.toLowerCase() === v.name.toLowerCase());

      const vdata = {
        name: v.name,
        sku: v.sku || null,
        priceCents: v.priceCents,
        compareAtPriceCents: v.compareAtPriceCents,
        stock: v.stock,
        isActive: v.isActive,
        position: i,
      };

      try {
        if (match) {
          await db.productVariant.update({ where: { id: match.id }, data: vdata });
          updatedVariants++;
        } else {
          await db.productVariant.create({ data: { ...vdata, productId } });
          createdVariants++;
        }
      } catch {
        // El caso típico: el SKU ya lo usa otro producto (es único en toda la
        // tienda). Se avisa y sigue, en vez de tirar abajo la importación.
        warnings.push(
          `Fila ${v.line}: no se pudo guardar la variante "${v.name}"${v.sku ? ` (SKU ${v.sku})` : ""}. ¿El SKU ya está en otro producto?`,
        );
      }
    }

    // --- fotos ---------------------------------------------------------
    if (item.images.length > 0) {
      const fotos = await db.productImage.findMany({
        where: { productId },
        select: { url: true, position: true },
      });
      const yaEstan = new Set(fotos.map((f) => f.url));
      let position = fotos.reduce((max, f) => Math.max(max, f.position), -1);

      for (const url of item.images) {
        if (yaEstan.has(url)) continue;
        await db.productImage.create({
          data: { productId, url, alt: item.name, position: ++position },
        });
        addedImages++;
      }
    }
  }

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");

  return {
    ok: true,
    createdProducts,
    updatedProducts,
    createdVariants,
    updatedVariants,
    addedImages,
    warnings,
  };
}
