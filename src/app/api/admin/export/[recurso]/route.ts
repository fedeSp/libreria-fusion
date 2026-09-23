import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { expireStaleOrders } from "@/lib/orders";
import { CSV_BOM, toCsv } from "@/lib/csv";
import { formatPriceForCsv } from "@/lib/money";
import { formatDateTimeForCsv } from "@/lib/dates";
import { STATUS_LABEL } from "@/components/order-status";
import {
  CATEGORY_COLUMNS,
  CATEGORY_CSV_HEADER,
  PRODUCT_COLUMNS,
  PRODUCT_CSV_HEADER,
  ORDER_COLUMNS,
  ORDER_CSV_HEADER,
  IMAGE_SEPARATOR,
  formatFlag,
  rowFromValues,
} from "@/lib/catalog-csv";

// Exportación a CSV: catálogo (categorías y productos) y pedidos.
//
// Las filas se arman por NOMBRE de columna (rowFromValues), no por posición, y
// las cabeceras salen del mismo módulo que usan los importadores. Así lo que
// escribe esta ruta es, por construcción, lo que el importador sabe leer:
// bajar el catálogo, editarlo en la planilla y volver a subirlo es una ida y
// vuelta sin pérdida.
//
// Los pedidos NO se importan: son el registro de lo que pasó.

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

function esEstadoValido(valor: string | null): valor is OrderStatus {
  return valor != null && valor in STATUS_LABEL;
}

async function pedidosCsv(estado: string | null): Promise<string[][]> {
  // Igual que la pantalla de pedidos: primero se caen solos los que vencieron
  // sin pagar, para que la planilla no liste como "esperando pago" algo que en
  // realidad ya está cancelado.
  await expireStaleOrders();

  const orders = await db.order.findMany({
    where: esEstadoValido(estado) ? { status: estado } : {},
    orderBy: { number: "desc" },
    include: {
      paymentMethod: { select: { label: true } },
      items: true,
      // El id del pago en Mercado Pago, para poder conciliar la planilla contra
      // el resumen de MP sin entrar pedido por pedido.
      payments: {
        where: { status: "APROBADO" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { providerPaymentId: true },
      },
    },
  });

  return [
    [...ORDER_CSV_HEADER],
    ...orders.map((o) =>
      rowFromValues(ORDER_COLUMNS, {
        number: String(o.number),
        date: formatDateTimeForCsv(o.createdAt),
        status: STATUS_LABEL[o.status],
        customer: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        delivery:
          o.deliveryMethod === "ENVIO_DOMICILIO" ? "Envío a domicilio" : "Retiro en el local",
        address: o.shippingAddress ?? "",
        city: o.shippingCity ?? "",
        postalCode: o.shippingPostalCode ?? "",
        paymentMethod: o.paymentMethod?.label ?? "",
        subtotal: formatPriceForCsv(o.subtotalCents),
        total: formatPriceForCsv(o.totalCents),
        units: String(o.items.reduce((n, it) => n + it.quantity, 0)),
        // Los nombres salen de OrderItem, que los copió al momento de la compra:
        // la planilla dice lo que el cliente compró, no cómo se llama hoy.
        items: o.items
          .map(
            (it) =>
              `${it.quantity}x ${it.productName}` +
              (it.variantName && it.variantName !== "Único" ? ` (${it.variantName})` : ""),
          )
          .join("; "),
        note: o.customerNote ?? "",
        paidAt: formatDateTimeForCsv(o.paidAt),
        pickedUpAt: formatDateTimeForCsv(o.pickedUpAt),
        providerPaymentId: o.payments[0]?.providerPaymentId ?? "",
      }),
    ),
  ];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ recurso: string }> },
) {
  if (!(await getAdmin())) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { recurso } = await params;
  let rows: string[][];

  if (recurso === "categorias") {
    rows = await categoriasCsv();
  } else if (recurso === "productos") {
    rows = await productosCsv();
  } else if (recurso === "pedidos") {
    // Mismo parámetro que usa la pantalla, para que el botón exporte lo que la
    // persona está viendo y no siempre el listado completo.
    rows = await pedidosCsv(new URL(req.url).searchParams.get("estado"));
  } else {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(CSV_BOM + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${recurso}-${fecha}.csv"`,
      // Es una foto de la tienda en este momento: que nadie la guarde.
      "Cache-Control": "no-store",
    },
  });
}
