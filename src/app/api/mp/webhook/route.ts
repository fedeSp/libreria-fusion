import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getPayment } from "@/lib/mercadopago";
import { notifyAdminNewOrder } from "@/lib/email";
import type { PaymentStatus } from "@prisma/client";

// Mercado Pago llama a esta URL cuando cambia el estado de un pago. Nunca
// confiamos en el cuerpo: sacamos el id, le preguntamos a MP el estado real,
// y recién ahí actualizamos el pedido. Diseñado para ser idempotente porque
// MP reintenta y puede mandar la misma notificación varias veces.

// MP → nuestros estados.
function mapStatus(mpStatus: string): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return "APROBADO";
    case "rejected":
    case "cancelled":
    case "charged_back":
      return "RECHAZADO";
    case "refunded":
      return "REEMBOLSADO";
    default:
      return "PENDIENTE";
  }
}

// Verificación de firma de MP (x-signature). Si no hay secreto configurado,
// no bloqueamos (útil en desarrollo), pero en producción conviene setearlo.
function verifySignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const sig = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!sig) return false;

  // x-signature: "ts=1699...,v1=hexhmac"
  const parts = Object.fromEntries(
    sig.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string]),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // El id del pago puede venir por query (?data.id=) o en el cuerpo JSON.
    let type = url.searchParams.get("type") ?? url.searchParams.get("topic");
    let paymentId =
      url.searchParams.get("data.id") ?? url.searchParams.get("id");

    if (!paymentId) {
      const body = await req.json().catch(() => null);
      if (body) {
        type = type ?? body.type ?? body.topic;
        paymentId = body.data?.id ?? body.id ?? null;
      }
    }

    // Solo nos interesan notificaciones de pago. El resto se confirma con 200.
    if (type && type !== "payment") {
      return NextResponse.json({ ignored: type }, { status: 200 });
    }
    if (!paymentId) {
      return NextResponse.json({ error: "sin id de pago" }, { status: 200 });
    }

    if (!verifySignature(req, paymentId)) {
      return NextResponse.json({ error: "firma inválida" }, { status: 401 });
    }

    const payment = await getPayment(paymentId);
    if (!payment) {
      // No pudimos leer el pago: devolvemos 500 para que MP reintente.
      return NextResponse.json({ error: "pago no encontrado" }, { status: 500 });
    }

    const orderId = payment.externalReference;
    if (!orderId) {
      return NextResponse.json({ error: "sin referencia" }, { status: 200 });
    }

    const status = mapStatus(payment.status);

    // Marca si en esta notificación el pedido recién pasa a PAGADO, para mandar
    // el mail al admin una sola vez, fuera de la transacción.
    let justPaid = false;

    await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) return;

      // Idempotencia: registramos/actualizamos el pago por su id de MP.
      await tx.payment.upsert({
        where: { providerPaymentId: payment.id },
        create: {
          orderId,
          paymentMethodId: order.paymentMethodId,
          status,
          amountCents: payment.amountCents,
          providerPaymentId: payment.id,
          providerStatus: payment.status,
        },
        update: { status, providerStatus: payment.status },
      });

      // La transición a PAGADO ocurre una sola vez: solo si el pago está
      // aprobado y el pedido todavía no fue marcado como pagado.
      if (status === "APROBADO" && order.status === "PENDIENTE_PAGO") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "PAGADO", paidAt: new Date() },
        });
        justPaid = true;
        // Descontamos stock recién con el pago confirmado, no antes.
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const it of items) {
          if (it.variantId) {
            await tx.productVariant.update({
              where: { id: it.variantId },
              data: { stock: { decrement: it.quantity } },
            });
          }
        }
      }

      // Pago rechazado/cancelado sobre un pedido aún pendiente: lo cancelamos.
      if (status === "RECHAZADO" && order.status === "PENDIENTE_PAGO") {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "CANCELADO" },
        });
      }
    });

    // Mail al admin cuando la compra se confirma. Fuera de la transacción y
    // sin await bloqueante del éxito: si el mail falla, el pago ya quedó
    // registrado igual y no reintentamos toda la notificación por eso.
    if (justPaid) {
      try {
        const paid = await db.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
        if (paid) await notifyAdminNewOrder(paid);
      } catch (mailErr) {
        console.error("No se pudo enviar el mail de aviso:", mailErr);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Error en webhook MP:", err);
    // 500 para que MP reintente ante un error transitorio.
    return NextResponse.json({ error: "error interno" }, { status: 500 });
  }
}
