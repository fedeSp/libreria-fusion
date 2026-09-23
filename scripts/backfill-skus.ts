// Asigna SKU a las variantes que todavía no tienen, con el mismo formato que
// genera el panel (ver src/lib/sku.ts).
//
// Por defecto NO escribe: muestra qué haría. Para aplicarlo de verdad hay que
// pasarle --apply.
//
//   docker compose -f docker-compose.prod.yml run --rm migrate \
//     npx tsx scripts/backfill-skus.ts            # vista previa
//   docker compose -f docker-compose.prod.yml run --rm migrate \
//     npx tsx scripts/backfill-skus.ts --apply    # aplica
//
// Es idempotente: una variante que ya tiene código no se toca, así que correrlo
// dos veces no cambia nada la segunda vez.

import { PrismaClient } from "@prisma/client";
import { buildSku, nextProductNumber, productNumberFromSku, skuPrefix } from "../src/lib/sku";

const db = new PrismaClient();
const aplicar = process.argv.includes("--apply");

async function main() {
  const products = await db.product.findMany({
    // Orden estable: el mismo catálogo produce siempre los mismos números,
    // corra cuando corra.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      category: { select: { name: true } },
      variants: { orderBy: [{ position: "asc" }, { id: "asc" }] },
    },
  });

  // Códigos ya usados, por prefijo, para no pisar nada de lo que exista.
  const usadosPorPrefijo = new Map<string, string[]>();
  const todosLosSkus = new Set<string>();
  for (const p of products) {
    for (const v of p.variants) {
      if (!v.sku) continue;
      todosLosSkus.add(v.sku);
      const prefix = skuPrefix(p.name, p.category?.name);
      usadosPorPrefijo.set(prefix, [...(usadosPorPrefijo.get(prefix) ?? []), v.sku]);
    }
  }

  const cambios: { variantId: string; sku: string; producto: string; variante: string }[] = [];
  let yaTenian = 0;

  for (const p of products) {
    const prefix = skuPrefix(p.name, p.category?.name);
    const usados = usadosPorPrefijo.get(prefix) ?? [];

    // Si el producto ya tenía un código con este prefijo, se respeta su número:
    // las variantes nuevas se suman a la misma familia en vez de abrir otra.
    const propio = p.variants
      .map((v) => (v.sku ? productNumberFromSku(v.sku, prefix) : null))
      .find((n): n is number => n !== null);

    const numero = propio ?? nextProductNumber(prefix, usados);

    p.variants.forEach((v, i) => {
      if (v.sku) {
        yaTenian++;
        return;
      }
      const sku = buildSku(prefix, numero, i);
      if (todosLosSkus.has(sku)) {
        throw new Error(
          `Colisión inesperada: ${sku} para "${p.name}" / "${v.name}". No se aplicó nada.`,
        );
      }
      todosLosSkus.add(sku);
      cambios.push({ variantId: v.id, sku, producto: p.name, variante: v.name });
    });

    if (propio === undefined) {
      usadosPorPrefijo.set(prefix, [...usados, buildSku(prefix, numero, 0)]);
    }
  }

  console.log(`Productos: ${products.length}`);
  console.log(`Variantes con SKU: ${yaTenian}`);
  console.log(`Variantes a completar: ${cambios.length}\n`);

  for (const c of cambios) {
    console.log(`  ${c.sku.padEnd(18)} ${c.producto.slice(0, 52).padEnd(54)} ${c.variante}`);
  }

  if (!aplicar) {
    console.log("\nVista previa: no se escribió nada. Agregá --apply para aplicarlo.");
    return;
  }

  // Una transacción: o quedan todos los códigos o no queda ninguno. Un catálogo
  // a medio numerar es peor que uno sin numerar.
  await db.$transaction(
    cambios.map((c) => db.productVariant.update({ where: { id: c.variantId }, data: { sku: c.sku } })),
  );

  console.log(`\nListo: ${cambios.length} variantes actualizadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
