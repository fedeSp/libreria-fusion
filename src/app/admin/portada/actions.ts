"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

// Carrusel de la portada. Las imágenes se suben con /api/admin/upload, igual
// que las fotos de producto; acá solo se ordenan y se les pone el texto
// alternativo y el link.

function revalidar() {
  revalidatePath("/admin/portada");
  revalidatePath("/", "layout");
}

export async function addHeroSlide(
  imageUrl: string,
  alt: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!imageUrl.trim()) return { ok: false, error: "Falta la imagen." };

  const ultima = await db.heroSlide.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await db.heroSlide.create({
    data: {
      imageUrl: imageUrl.trim(),
      // El alt se puede completar después; vacío es peor que provisorio.
      alt: alt.trim() || "Promoción de Librería Fusión",
      position: (ultima?.position ?? -1) + 1,
    },
  });

  revalidar();
  return { ok: true };
}

export async function updateHeroSlide(
  id: string,
  alt: string,
  linkUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const texto = alt.trim();
  if (!texto) return { ok: false, error: "Escribí qué dice la imagen." };

  const link = linkUrl.trim();
  // Solo rutas de la propia tienda o URLs completas: sin esto, un "javascript:"
  // pegado en el campo terminaría siendo un link ejecutable en la home.
  if (link && !/^(\/|https?:\/\/)/i.test(link)) {
    return { ok: false, error: "El link tiene que empezar con / o con https://" };
  }

  await db.heroSlide.update({ where: { id }, data: { alt: texto, linkUrl: link || null } });
  revalidar();
  return { ok: true };
}

export async function toggleHeroSlide(id: string, isActive: boolean) {
  await requireAdmin();
  await db.heroSlide.update({ where: { id }, data: { isActive } });
  revalidar();
  return { ok: true };
}

export async function deleteHeroSlide(id: string) {
  await requireAdmin();
  await db.heroSlide.delete({ where: { id } });
  revalidar();
  return { ok: true };
}

/**
 * Sube o baja una imagen en el orden. Se intercambian las posiciones con la
 * vecina en una transacción, para que no quede un orden a medio aplicar si algo
 * falla entre las dos escrituras.
 */
export async function moveHeroSlide(id: string, direccion: "arriba" | "abajo") {
  await requireAdmin();

  const todas = await db.heroSlide.findMany({ orderBy: { position: "asc" } });
  const i = todas.findIndex((s) => s.id === id);
  if (i === -1) return { ok: false };

  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (j < 0 || j >= todas.length) return { ok: true }; // ya estaba en la punta

  await db.$transaction([
    db.heroSlide.update({ where: { id: todas[i].id }, data: { position: j } }),
    db.heroSlide.update({ where: { id: todas[j].id }, data: { position: i } }),
  ]);

  revalidar();
  return { ok: true };
}
