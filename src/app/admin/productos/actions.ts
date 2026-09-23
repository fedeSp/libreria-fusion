"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePriceToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";


// Garantiza un slug único agregando un sufijo si ya existe.
async function uniqueSlug(base: string): Promise<string> {
  const root = base || "producto";
  let slug = root;
  let n = 1;
  while (await db.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${root}-${++n}`;
  }
  return slug;
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleProductFeatured(id: string, isFeatured: boolean) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { isFeatured } });
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type ProductFormState = { ok: boolean; error?: string };

// Guarda los campos de texto y categoría del producto, más precio y stock de
// cada variante. Los precios llegan como texto en pesos y se convierten a
// centavos con la única función que sabe hacerlo (parsePriceToCents).
export async function saveProduct(
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false, error: "El nombre es obligatorio." };

  const categoryId = String(formData.get("categoryId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  const variants = await db.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });

  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          name,
          summary: summary || null,
          description: description || null,
          categoryId: categoryId || null,
        },
      });

      for (const v of variants) {
        const priceRaw = formData.get(`price_${v.id}`);
        const stockRaw = formData.get(`stock_${v.id}`);
        if (priceRaw == null && stockRaw == null) continue;
        const data: { priceCents?: number; stock?: number } = {};
        if (priceRaw != null) data.priceCents = parsePriceToCents(String(priceRaw));
        if (stockRaw != null) {
          const s = Math.max(0, Math.floor(Number(stockRaw)));
          if (Number.isFinite(s)) data.stock = s;
        }
        await tx.productVariant.update({ where: { id: v.id }, data });
      }
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al guardar" };
  }

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export type NewProductInput = {
  name: string;
  slug: string;
  summary: string;
  description: string;
  categoryId: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: { name: string; price: string; stock: string }[];
  images: { url: string; alt: string }[];
};

// Alta de producto. Recibe datos estructurados (no FormData) porque tiene listas
// dinámicas de variantes e imágenes.
export async function createProduct(
  input: NewProductInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireAdmin();

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "El nombre es obligatorio." };

  const variants = input.variants
    .map((v) => ({ name: v.name.trim() || "Único", price: v.price, stock: v.stock }))
    .filter((v) => v.price.trim() !== "");
  if (variants.length === 0) {
    return { ok: false, error: "Cargá al menos una variante con precio." };
  }

  let variantData;
  try {
    variantData = variants.map((v, i) => ({
      name: v.name,
      priceCents: parsePriceToCents(v.price),
      stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
      position: i,
    }));
  } catch {
    return { ok: false, error: "Algún precio tiene un formato inválido." };
  }

  const images = input.images
    .filter((im) => im.url.trim() !== "")
    .map((im, i) => ({ url: im.url.trim(), alt: im.alt.trim() || name, position: i }));

  const slug = await uniqueSlug(slugify(input.slug.trim() || name));

  const product = await db.product.create({
    data: {
      name,
      slug,
      summary: input.summary.trim() || null,
      description: input.description.trim() || null,
      categoryId: input.categoryId || null,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      variants: { create: variantData },
      images: images.length ? { create: images } : undefined,
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true, id: product.id };
}

// Baja de producto. Si ya tiene pedidos, NO se borra (se perdería el historial):
// se desactiva. Si nunca se vendió, se elimina de verdad (borra variantes e
// imágenes en cascada).
export async function deleteProduct(
  id: string,
): Promise<{ ok: boolean; error?: string; deactivated?: boolean }> {
  await requireAdmin();

  const usados = await db.orderItem.count({
    where: { variant: { productId: id } },
  });

  if (usados > 0) {
    await db.product.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/admin/productos");
    revalidatePath("/", "layout");
    return { ok: true, deactivated: true };
  }

  await db.product.delete({ where: { id } });
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Agrega una imagen (ya subida, con su URL) a un producto, al final del orden.
export async function addProductImage(
  productId: string,
  url: string,
  alt: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!url.trim()) return { ok: false, error: "Falta la URL de la imagen." };

  const last = await db.productImage.findFirst({
    where: { productId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { name: true },
  });

  await db.productImage.create({
    data: {
      productId,
      url: url.trim(),
      alt: alt.trim() || product?.name || "Foto de producto",
      position: (last?.position ?? -1) + 1,
    },
  });
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

// Borra una imagen de producto.
export async function deleteProductImage(
  imageId: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const img = await db.productImage.delete({ where: { id: imageId } });
  revalidatePath(`/admin/productos/${img.productId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

// Mueve una imagen al primer lugar (la portada del producto).
export async function makeImageCover(
  imageId: string,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const img = await db.productImage.findUnique({ where: { id: imageId } });
  if (!img) return { ok: false };
  const others = await db.productImage.findMany({
    where: { productId: img.productId, id: { not: imageId } },
    orderBy: { position: "asc" },
  });
  // La portada queda en 0 y el resto se recompone detrás.
  await db.$transaction([
    db.productImage.update({ where: { id: imageId }, data: { position: 0 } }),
    ...others.map((o, i) =>
      db.productImage.update({ where: { id: o.id }, data: { position: i + 1 } }),
    ),
  ]);
  revalidatePath(`/admin/productos/${img.productId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

// Asigna (o saca) la variante dueña de una foto. Sin variante, la foto es
// general y se muestra sea cual sea el color elegido en la ficha.
export async function setProductImageVariant(
  imageId: string,
  variantId: string | null,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const img = await db.productImage.update({
    where: { id: imageId },
    data: { variantId },
  });
  revalidatePath(`/admin/productos/${img.productId}`);
  revalidatePath("/", "layout");
  return { ok: true };
}
