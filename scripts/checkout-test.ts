// Test del recorrido que toca la plata: resolver el carrito contra la base,
// confirmar el pago, descontar stock una sola vez y no vender de menos.
//
//   docker compose up -d db
//   npm run test:checkout
//
// Crea sus propios datos con prefijo "test-checkout-" y los borra al final,
// pase lo que pase. Se niega a correr si la base no es local: este script
// escribe, y escribir en la base de la tienda para probar algo no se hace.

import { PrismaClient } from "@prisma/client";
import { resolveLines } from "../src/lib/checkout";
import { aplicarPago } from "../src/lib/orders";

const db = new PrismaClient();
const PREFIJO = "test-checkout-";

let fallas = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "ok  " : "FALLA"}  ${nombre}${ok ? "" : "  -> " + detalle}`);
  if (!ok) fallas++;
}

function exigirBaseLocal() {
  const url = process.env.DATABASE_URL ?? "";
  const local = /@(localhost|127\.0\.0\.1|db):/.test(url);
  if (!local) {
    console.error("DATABASE_URL no apunta a una base local. Abortado.");
    process.exit(1);
  }
}

async function crearProducto(nombre: string, stock: number, precioCents: number) {
  return db.product.create({
    data: {
      name: `${PREFIJO}${nombre}`,
      slug: `${PREFIJO}${nombre}`,
      isActive: true,
      variants: {
        create: [{ name: "Único", priceCents: precioCents, stock, isActive: true, position: 0 }],
      },
    },
    include: { variants: true },
  });
}

async function crearPedido(
  variantId: string,
  cantidad: number,
  precioCents: number,
  metodoId: string,
) {
  return db.order.create({
    data: {
      status: "PENDIENTE_PAGO",
      customerName: `${PREFIJO}cliente`,
      customerEmail: "test@example.com",
      customerPhone: "1100000000",
      subtotalCents: precioCents * cantidad,
      totalCents: precioCents * cantidad,
      paymentMethodId: metodoId,
      items: {
        create: [
          {
            variantId,
            productName: `${PREFIJO}producto`,
            variantName: "Único",
            unitPriceCents: precioCents,
            quantity: cantidad,
            lineTotalCents: precioCents * cantidad,
          },
        ],
      },
    },
  });
}

async function limpiar() {
  await db.order.deleteMany({ where: { customerName: { startsWith: PREFIJO } } });
  await db.product.deleteMany({ where: { slug: { startsWith: PREFIJO } } });
  await db.paymentMethod.deleteMany({ where: { code: { startsWith: PREFIJO } } });
}

async function main() {
  exigirBaseLocal();
  await limpiar();

  const metodo = await db.paymentMethod.create({
    data: { code: `${PREFIJO}mp`, label: "Prueba", isOnline: true, isActive: true },
  });

  // ---------------------------------------------------------------- carrito
  console.log("\n=== el precio y el stock salen de la base, no del cliente ===");
  const p = await crearProducto("cuaderno", 10, 150000);
  const v = p.variants[0];

  const [linea] = await resolveLines([{ variantId: v.id, quantity: 2 }]);
  check("toma el precio de la base", linea?.unitPriceCents === 150000, String(linea?.unitPriceCents));
  check("el total de la línea lo calcula el server", linea?.lineTotalCents === 300000, String(linea?.lineTotalCents));

  const [recortada] = await resolveLines([{ variantId: v.id, quantity: 999 }]);
  check("no deja comprar más de lo que hay", recortada?.quantity === 10, String(recortada?.quantity));

  await db.productVariant.update({ where: { id: v.id }, data: { isActive: false } });
  check("una variante desactivada se cae del carrito", (await resolveLines([{ variantId: v.id, quantity: 1 }])).length === 0);
  await db.productVariant.update({ where: { id: v.id }, data: { isActive: true } });

  check("un id inventado se ignora", (await resolveLines([{ variantId: "no-existe", quantity: 1 }])).length === 0);

  // ------------------------------------------------------------------ pago
  console.log("\n=== confirmar el pago descuenta stock una sola vez ===");
  const pedido = await crearPedido(v.id, 3, 150000, metodo.id);

  const primera = await aplicarPago(pedido.id, {
    id: `${PREFIJO}pago-1`,
    estado: "APROBADO",
    estadoProveedor: "approved",
    montoCents: 450000,
  });
  const trasPago = await db.order.findUnique({ where: { id: pedido.id } });
  const stock1 = (await db.productVariant.findUnique({ where: { id: v.id } }))!.stock;

  check("el pedido queda PAGADO", trasPago?.status === "PAGADO", String(trasPago?.status));
  check("queda registrada la fecha de pago", trasPago?.paidAt != null);
  check("el stock baja de 10 a 7", stock1 === 7, String(stock1));
  check("avisa que recién se pagó", primera.reciénPagado);
  check("no reporta sobreventa", primera.sobrevendidas.length === 0);

  console.log("\n=== Mercado Pago reintenta: no puede cobrar stock dos veces ===");
  const segunda = await aplicarPago(pedido.id, {
    id: `${PREFIJO}pago-1`,
    estado: "APROBADO",
    estadoProveedor: "approved",
    montoCents: 450000,
  });
  const stock2 = (await db.productVariant.findUnique({ where: { id: v.id } }))!.stock;
  check("el stock sigue en 7", stock2 === 7, String(stock2));
  check("ya no dice que recién se pagó", !segunda.reciénPagado);
  check("no duplica el pago registrado", (await db.payment.count({ where: { orderId: pedido.id } })) === 1);

  // ------------------------------------------------------------- sobreventa
  console.log("\n=== dos personas compran la última unidad ===");
  const p2 = await crearProducto("ultima", 1, 100000);
  const v2 = p2.variants[0];
  const pedidoA = await crearPedido(v2.id, 1, 100000, metodo.id);
  const pedidoB = await crearPedido(v2.id, 1, 100000, metodo.id);

  await aplicarPago(pedidoA.id, { id: `${PREFIJO}pago-A`, estado: "APROBADO", estadoProveedor: "approved", montoCents: 100000 });
  const r = await aplicarPago(pedidoB.id, { id: `${PREFIJO}pago-B`, estado: "APROBADO", estadoProveedor: "approved", montoCents: 100000 });
  const stockFinal = (await db.productVariant.findUnique({ where: { id: v2.id } }))!.stock;

  check("el stock queda en 0 y no en -1", stockFinal === 0, String(stockFinal));
  check("el segundo pedido se cobra igual", (await db.order.findUnique({ where: { id: pedidoB.id } }))?.status === "PAGADO");
  check("la sobreventa queda reportada", r.sobrevendidas.length === 1, JSON.stringify(r.sobrevendidas));

  // ---------------------------------------------------------------- rechazo
  console.log("\n=== un pago rechazado cancela el pedido ===");
  const p3 = await crearProducto("rechazo", 5, 100000);
  const v3 = p3.variants[0];
  const pedidoC = await crearPedido(v3.id, 2, 100000, metodo.id);

  await aplicarPago(pedidoC.id, { id: `${PREFIJO}pago-C`, estado: "RECHAZADO", estadoProveedor: "rejected", montoCents: 200000 });
  const cancelado = await db.order.findUnique({ where: { id: pedidoC.id } });
  const stockIntacto = (await db.productVariant.findUnique({ where: { id: v3.id } }))!.stock;

  check("el pedido queda CANCELADO", cancelado?.status === "CANCELADO", String(cancelado?.status));
  check("no se tocó el stock", stockIntacto === 5, String(stockIntacto));

  console.log(fallas === 0 ? "\nTODO OK\n" : `\n${fallas} FALLAS\n`);
}

main()
  .catch((e) => {
    console.error(e);
    fallas++;
  })
  .finally(async () => {
    await limpiar();
    await db.$disconnect();
    process.exit(fallas === 0 ? 0 : 1);
  });
