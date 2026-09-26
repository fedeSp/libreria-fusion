import "server-only";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { db } from "./db";

// A qué estados puede pasar un pedido desde cada estado.
//
// VIVE EN UN SOLO LUGAR a propósito: estaba escrita dos veces, en la acción del
// servidor y en la pantalla que dibuja los botones, con un comentario que pedía
// mantenerlas iguales. Eso funciona hasta que alguien toca una sola.
//
// ENTREGADO y CANCELADO no tienen salida: un pedido terminado no se vuelve a
// mover. Es lo que evita que se reabra algo ya entregado y el stock o la plata
// queden contando dos veces.
export const TRANSICIONES: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE_PAGO: ["PAGADO", "CANCELADO"],
  PAGADO: ["EN_PREPARACION", "LISTO_PARA_RETIRAR", "CANCELADO"],
  EN_PREPARACION: ["LISTO_PARA_RETIRAR", "CANCELADO"],
  LISTO_PARA_RETIRAR: ["ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

// Estados en los que el pedido ya cobró.
export const ESTADOS_PAGADOS: OrderStatus[] = ["PAGADO", "EN_PREPARACION", "LISTO_PARA_RETIRAR"];

// Vencimiento de pedidos sin pagar. No hay cron en esta app — todo se
// renderiza por request — así que en vez de un worker en segundo plano, cada
// página que lista o muestra pedidos llama a esto primero. Es barato (un solo
// UPDATE indexado) e idempotente: si ya no queda ningún pedido vencido, no
// actualiza nada.
export async function expireStaleOrders(): Promise<number> {
  const result = await db.order.updateMany({
    where: { status: "PENDIENTE_PAGO", expiresAt: { lt: new Date() } },
    data: { status: "CANCELADO" },
  });
  return result.count;
}

export type ResultadoDePago = {
  /** true solo la vez que el pedido pasa de esperando-pago a pagado. */
  reciénPagado: boolean;
  /** Variantes que se vendieron por encima del stock que había. */
  sobrevendidas: { variantId: string; producto: string; pedidas: number; habia: number }[];
};

/**
 * Aplica a un pedido lo que Mercado Pago informó sobre un pago.
 *
 * VIVE ACÁ Y NO EN EL WEBHOOK a propósito: dentro del route handler solo se
 * podía probar levantando un servidor y hablando con Mercado Pago de verdad.
 * Separada, el recorrido que toca la plata —confirmar, descontar stock, no
 * descontarlo dos veces— se puede testear contra una base y nada más.
 *
 * Es idempotente: el pago se registra por su id de Mercado Pago y la transición
 * a PAGADO ocurre una sola vez, por más que MP reintente la notificación.
 */
export async function aplicarPago(
  orderId: string,
  pago: { id: string; estado: PaymentStatus; estadoProveedor: string; montoCents: number },
): Promise<ResultadoDePago> {
  let reciénPagado = false;
  const sobrevendidas: ResultadoDePago["sobrevendidas"] = [];

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return;

    await tx.payment.upsert({
      where: { providerPaymentId: pago.id },
      create: {
        orderId,
        paymentMethodId: order.paymentMethodId,
        status: pago.estado,
        amountCents: pago.montoCents,
        providerPaymentId: pago.id,
        providerStatus: pago.estadoProveedor,
      },
      update: { status: pago.estado, providerStatus: pago.estadoProveedor },
    });

    if (pago.estado === "APROBADO" && order.status === "PENDIENTE_PAGO") {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "PAGADO", paidAt: new Date() },
      });
      reciénPagado = true;

      // El stock se descuenta recién con el pago confirmado, nunca antes.
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const it of items) {
        if (!it.variantId) continue;

        // GREATEST(0, ...) en vez de un decrement a secas: si dos personas
        // compran la última unidad casi a la vez, las dos pasan por acá y el
        // stock terminaba en negativo. El FROM devuelve el valor previo, que
        // es lo único que permite darse cuenta de que hubo sobreventa.
        const filas = await tx.$queryRaw<{ antes: number }[]>`
          UPDATE "ProductVariant" v
          SET stock = GREATEST(0, v.stock - ${it.quantity})
          FROM "ProductVariant" previo
          WHERE v.id = ${it.variantId} AND previo.id = v.id
          RETURNING previo.stock AS antes
        `;

        const antes = filas[0]?.antes;
        if (antes !== undefined && antes < it.quantity) {
          sobrevendidas.push({
            variantId: it.variantId,
            producto: `${it.productName} (${it.variantName})`,
            pedidas: it.quantity,
            habia: antes,
          });
        }
      }
    }

    if (pago.estado === "RECHAZADO" && order.status === "PENDIENTE_PAGO") {
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELADO" } });
    }
  });

  return { reciénPagado, sobrevendidas };
}
