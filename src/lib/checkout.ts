import "server-only";
import { db } from "./db";
import type { CartLine, ResolvedLine } from "./cart";

// Traduce las líneas del carrito (solo variantId + cantidad, que vienen del
// navegador) a líneas completas con precio y stock sacados de la base. Este es
// el punto donde se deja de confiar en el cliente: el precio SIEMPRE sale de acá.
export async function resolveLines(lines: CartLine[]): Promise<ResolvedLine[]> {
  const ids = [...new Set(lines.map((l) => l.variantId))];
  if (ids.length === 0) return [];

  const variants = await db.productVariant.findMany({
    where: { id: { in: ids }, isActive: true, product: { isActive: true } },
    include: {
      product: {
        select: {
          slug: true,
          name: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      },
    },
  });

  const byId = new Map(variants.map((v) => [v.id, v]));

  const resolved: ResolvedLine[] = [];
  for (const line of lines) {
    const v = byId.get(line.variantId);
    if (!v) continue; // variante borrada o desactivada: se cae del carrito
    // No se puede comprar más de lo que hay; si el stock bajó, se ajusta.
    const quantity = Math.min(line.quantity, v.stock);
    if (quantity <= 0) continue;
    const image = v.product.images[0];
    resolved.push({
      variantId: v.id,
      productSlug: v.product.slug,
      productName: v.product.name,
      variantName: v.name,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? v.product.name,
      unitPriceCents: v.priceCents,
      stock: v.stock,
      quantity,
      lineTotalCents: v.priceCents * quantity,
    });
  }
  return resolved;
}
