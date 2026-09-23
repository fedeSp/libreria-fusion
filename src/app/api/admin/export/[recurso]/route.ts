import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { CSV_BOM, toCsv } from "@/lib/csv";
import { formatPriceForCsv } from "@/lib/money";
import {
  CATEGORY_COLUMNS,
  CATEGORY_CSV_HEADER,
  PRODUCT_COLUMNS,
  PRODUCT_CSV_HEADER,
  IMAGE_SEPARATOR,
  formatFlag,
  rowFromValues,
} from "@/lib/catalog-csv";

// Exportación del catálogo a CSV.
//
// Las filas se arman por NOMBRE de columna (rowFromValues), no por posición, y
// las cabeceras salen del mismo módulo que usan los importadores. Así lo que
// escribe esta ruta es, por construcción, lo que el importador sabe leer:
// bajar el catálogo, editarlo en la planilla y volver a subirlo es una ida y
// vuelta sin pérdida.

export const dynamic = "force-dynamic";

async function categoriasCsv(): Promise<string[][]> {
  const categories = await db.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { parent: { select: { slug: true } } },
  });

  return [
    [...CATEGORY_CSV_HEADER],
    ...categories.map((c) =>
      rowFromValues(CATEGORY_COLUMNS, {
        name: c.name,
        slug: c.slug,
        parentSlug: c.parent?.slug ?? "",
        description: c.description ?? "",
        position: String(c.position),
        isActive: formatFlag(c.isActive),
      }),
    ),
  ];
}

async function productosCsv(): Promise<string[][]> {
  const products = await db.product.findMany({
    orderBy: [{ name: "asc" }],
    include: {
      category: { select: { slug: true } },
      brand: { select: { name: true } },
      variants: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" }, select: { url: true } },
    },
  });

  const rows: string[][] = [[...PRODUCT_CSV_HEADER]];

  for (const p of products) {
    // Un producto sin variantes no debería existir (el precio vive ahí), pero
    // si aparece uno se exporta igual, con la fila vacía, en vez de perderlo.
    const variants = p.variants.length > 0 ? p.variants : [null];

    variants.forEach((v, i) => {
      rows.push(
        rowFromValues(PRODUCT_COLUMNS, {
          slug: p.slug,
          name: p.name,
          categorySlug: p.category?.slug ?? "",
          brand: p.brand?.name ?? "",
          summary: p.summary ?? "",
          description: p.description ?? "",
          isActive: formatFlag(p.isActive),
          isFeatured: formatFlag(p.isFeatured),
          variantName: v?.name ?? "",
          sku: v?.sku ?? "",
          price: v ? formatPriceForCsv(v.priceCents) : "",
          compareAtPrice:
            v?.compareAtPriceCents != null ? formatPriceForCsv(v.compareAtPriceCents) : "",
          stock: v ? String(v.stock) : "",
          variantActive: v ? formatFlag(v.isActive) : "",
          // Las fotos son del producto, no de la variante: van una sola vez, en
          // su primera fila. El importador igual las junta de todas las filas.
          images: i === 0 ? p.images.map((im) => im.url).join(IMAGE_SEPARATOR) : "",
          metaTitle: p.metaTitle ?? "",
          metaDescription: p.metaDescription ?? "",
        }),
      );
    });
  }

  return rows;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ recurso: string }> },
) {
  if (!(await getAdmin())) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { recurso } = await params;
  let rows: string[][];

  if (recurso === "categorias") rows = await categoriasCsv();
  else if (recurso === "productos") rows = await productosCsv();
  else return new NextResponse("No encontrado", { status: 404 });

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(CSV_BOM + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${recurso}-${fecha}.csv"`,
      // Es una foto del catálogo en este momento: que nadie la guarde.
      "Cache-Control": "no-store",
    },
  });
}
