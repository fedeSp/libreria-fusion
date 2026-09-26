"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { refundPayment } from "@/lib/mercadopago";
import { notifyCustomerOrderCancelled, notifyCustomerOrderReady } from "@/lib/email";

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

// Estados en los que el pedido ya cobró: cancelarlos implica devolver la plata.
const PAID_STATES: OrderStatus[] = ["PAGADO", "EN_PREPARACION", "LISTO_PARA_RETIRAR"];

type OrderConTodo = Awaited<ReturnType<typeof buscarPedido>>;

function buscarPedido(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: true, paymentMethod: true },
  });
}

// Un mail que falla no puede tumbar la operación: el pedido ya cambió de estado
// y eso es lo que importa. Queda en el log para poder avisar a mano.
async function avisar(que: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error(`No se pudo mandar el mail de "${que}":`, e);
  }
}

async function cancelarYReponer(order: NonNullable<OrderConTodo>, pagoId?: string) {
  await db.$transaction(async (tx) => {
    for (const it of order.items) {
      if (it.variantId) {
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { stock: { increment: it.quantity } },
        });
      }
    }
    if (pagoId) {
      await tx.payment.update({
        where: { id: pagoId },
        data: { status: "REEMBOLSADO", providerStatus: "refunded" },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELADO" } });
  });
}

function revalidar(numero: number) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${numero}`);
  revalidatePath("/", "layout");
}

export async function updateOrderStatus(orderId: string, next: OrderStatus) {
  await requireAdmin();

  const order = await buscarPedido(orderId);
  if (!order) return { ok: false, error: "Pedido no encontrado" };

  if (!ALLOWED[order.status].includes(next)) {
    return { ok: false, error: `No se puede pasar de ${order.status} a ${next}` };
  }

  // ------------------------------------------------------------ cancelación
  if (next === "CANCELADO") {
    const yaPago = PAID_STATES.includes(order.status);

    // Si nunca se pagó no hay nada que devolver, y decirle al cliente que le
    // reembolsamos algo sería mentirle.
    if (!yaPago) {
      await db.order.update({ where: { id: orderId }, data: { status: "CANCELADO" } });
      await avisar("cancelación", () => notifyCustomerOrderCancelled(order, "sin-pago"));
      revalidar(order.number);
      return { ok: true };
    }

    // Lo que se hace con la plata depende de por dónde entró. Mercado Pago se
    // devuelve solo; lo que se cobró en el mostrador se devuelve en el
    // mostrador, y el sistema no puede hacer más que avisarle a la persona.
    const esOnline = order.paymentMethod?.isOnline ?? false;

    if (esOnline) {
      const aprobado = order.payments.find((p) => p.status === "APROBADO" && p.providerPaymentId);
      if (!aprobado?.providerPaymentId) {
        return {
          ok: false,
          error:
            "Este pedido figura como pagado con Mercado Pago pero no encuentro el pago para reembolsarlo. Gestioná la devolución a mano antes de cancelar.",
        };
      }

      const refund = await refundPayment(aprobado.providerPaymentId);
      if (!refund.ok) {
        // No se cancela: dejar al cliente sin pedido Y sin plata es el único
        // desenlace realmente inaceptable.
        return {
          ok: false,
          error: `No se pudo reembolsar en Mercado Pago, el pedido NO se canceló: ${refund.error}`,
        };
      }

      await cancelarYReponer(order, aprobado.id);
      await avisar("cancelación con reembolso", () =>
        notifyCustomerOrderCancelled(order, "reembolsado"),
      );
      revalidar(order.number);
      return { ok: true, refunded: true };
    }

    // Pago en el local: no hay nada que devolver por sistema.
    const enLocal = order.payments.find((p) => p.status === "APROBADO");
    await cancelarYReponer(order, enLocal?.id);
    await avisar("cancelación con devolución en el local", () =>
      notifyCustomerOrderCancelled(order, "devolucion-en-local"),
    );
    revalidar(order.number);
    return { ok: true, devolucionEnLocal: true };
  }

  // ------------------------------------------------------- resto de estados
  const data: Record<string, unknown> = { status: next };
  if (next === "PAGADO" && !order.paidAt) data.paidAt = new Date();
  if (next === "LISTO_PARA_RETIRAR") data.readyAt = new Date();
  if (next === "ENTREGADO") data.pickedUpAt = new Date();

  await db.order.update({ where: { id: orderId }, data });

  // Para una tienda de retiro este es EL aviso: reemplaza que alguien tenga
  // que acordarse de escribirle por WhatsApp a cada cliente.
  if (next === "LISTO_PARA_RETIRAR") {
    await avisar("pedido listo", () => notifyCustomerOrderReady(order));
  }

  revalidar(order.number);
  return { ok: true };
}
