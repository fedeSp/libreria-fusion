"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { refundPayment } from "@/lib/mercadopago";

// Transiciones válidas del pedido desde el panel. No cualquier salto: solo los
// pasos que tienen sentido operativo, para no dejar un pedido en un estado raro.
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE_PAGO: ["PAGADO", "CANCELADO"],
  PAGADO: ["EN_PREPARACION", "LISTO_PARA_RETIRAR", "CANCELADO"],
  EN_PREPARACION: ["LISTO_PARA_RETIRAR", "CANCELADO"],
  LISTO_PARA_RETIRAR: ["ENTREGADO", "CANCELADO"],
  ENTREGADO: [],
  CANCELADO: [],
};

// Estados en los que el pedido ya cobró: cancelarlos exige reembolsar.
const PAID_STATES: OrderStatus[] = ["PAGADO", "EN_PREPARACION", "LISTO_PARA_RETIRAR"];

export async function updateOrderStatus(orderId: string, next: OrderStatus) {
  await requireAdmin();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };

  if (!ALLOWED[order.status].includes(next)) {
    return { ok: false, error: `No se puede pasar de ${order.status} a ${next}` };
  }

  // ---- Cancelación de un pedido YA PAGADO: reembolsar y reponer stock ----
  if (next === "CANCELADO" && PAID_STATES.includes(order.status)) {
    const approved = order.payments.find(
      (p) => p.status === "APROBADO" && p.providerPaymentId,
    );
    if (!approved?.providerPaymentId) {
      return {
        ok: false,
        error:
          "Este pedido figura como pagado pero no encuentro el pago en Mercado Pago para reembolsarlo. Gestioná el reembolso a mano antes de cancelar.",
      };
    }

    const refund = await refundPayment(approved.providerPaymentId);
    if (!refund.ok) {
      return {
        ok: false,
        error: `No se pudo reembolsar en Mercado Pago, el pedido NO se canceló: ${refund.error}`,
      };
    }

    // Reembolso OK: reponemos stock, marcamos el pago reembolsado y cancelamos.
    await db.$transaction(async (tx) => {
      for (const it of order.items) {
        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { increment: it.quantity } },
          });
        }
      }
      await tx.payment.update({
        where: { id: approved.id },
        data: { status: "REEMBOLSADO", providerStatus: "refunded" },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELADO" },
      });
    });

    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${order.number}`);
    revalidatePath("/", "layout");
    return { ok: true, refunded: true };
  }

  // ---- Resto de transiciones (incluye cancelar un pedido sin pagar) ----
  const data: Record<string, unknown> = { status: next };
  if (next === "PAGADO" && !order.paidAt) data.paidAt = new Date();
  if (next === "LISTO_PARA_RETIRAR") data.readyAt = new Date();
  if (next === "ENTREGADO") data.pickedUpAt = new Date();

  await db.order.update({ where: { id: orderId }, data });
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${order.number}`);
  return { ok: true };
}
