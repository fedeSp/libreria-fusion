"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { resolveLines } from "@/lib/checkout";
import { subtotalCents, type CartLine } from "@/lib/cart";
import {
  createPreference,
  isMercadoPagoConfigured,
} from "@/lib/mercadopago";

const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresá tu nombre").max(80),
    email: z.string().trim().email("Ingresá un email válido").max(120),
    phone: z.string().trim().min(6, "Ingresá un teléfono").max(30),
    note: z.string().trim().max(500).optional(),
    paymentMethodCode: z.string().trim().min(1, "Elegí un medio de pago"),
    deliveryMethod: z.enum(["RETIRO_LOCAL", "ENVIO_DOMICILIO"]).default("RETIRO_LOCAL"),
    shippingAddress: z.string().trim().max(200).optional(),
    shippingCity: z.string().trim().max(80).optional(),
    shippingPostalCode: z.string().trim().max(20).optional(),
  })
  // El domicilio solo es obligatorio si eligió envío: retiro en el local no
  // necesita dirección.
  .refine(
    (data) =>
      data.deliveryMethod !== "ENVIO_DOMICILIO" ||
      (data.shippingAddress && data.shippingCity && data.shippingPostalCode),
    { message: "Completá la dirección de envío.", path: ["shippingAddress"] },
  )
  // Efectivo se paga en persona: no tiene sentido combinarlo con envío. Se
  // valida acá también porque el cliente nunca es la fuente de verdad.
  .refine(
    (data) => !(data.paymentMethodCode === "efectivo" && data.deliveryMethod === "ENVIO_DOMICILIO"),
    { message: "Pagando en efectivo el pedido se retira en el local.", path: ["deliveryMethod"] },
  );

// Minutos que se mantiene esperando el pago un pedido de un medio ONLINE
// (Mercado Pago): si no completa el checkout en ese lapso, es un carrito
// abandonado. Los medios manuales (efectivo, Cuenta DNI) necesitan más
// margen porque el pago se coordina a mano por fuera del sitio.
const ORDER_TTL_MINUTES = 45;
const OFFLINE_ORDER_TTL_HOURS = 48;

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export type CheckoutResult =
  | { ok: true; orderNumber: number; initPoint: string | null }
  | { ok: false; error: string };

export type CheckoutContactInput = {
  name: string;
  email: string;
  phone: string;
  note?: string;
  paymentMethodCode: string;
  deliveryMethod: "RETIRO_LOCAL" | "ENVIO_DOMICILIO";
  shippingAddress?: string;
  shippingCity?: string;
  shippingPostalCode?: string;
};

export async function createCheckout(
  raw: CheckoutContactInput,
  cartLines: CartLine[],
): Promise<CheckoutResult> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // El medio de pago también sale de la base, nunca del cliente: si lo
  // desactivaste desde que cargó la página, el pedido no se crea con él.
  const method = await db.paymentMethod.findUnique({
    where: { code: parsed.data.paymentMethodCode },
  });
  if (!method || !method.isActive) {
    return { ok: false, error: "Ese medio de pago ya no está disponible. Elegí otro." };
  }

  // Reresolvemos contra la base: precios y stock autoritativos, nunca los del
  // cliente. Si algo cambió desde que armó el carrito, se refleja acá.
  const lines = await resolveLines(cartLines);
  if (lines.length === 0) {
    return { ok: false, error: "El carrito está vacío o los productos ya no están disponibles." };
  }

  const total = subtotalCents(lines);

  const expiresAt = method.isOnline
    ? new Date(Date.now() + ORDER_TTL_MINUTES * 60_000)
    : new Date(Date.now() + OFFLINE_ORDER_TTL_HOURS * 60 * 60_000);

  const order = await db.order.create({
    data: {
      status: "PENDIENTE_PAGO",
      customerName: parsed.data.name,
      customerEmail: parsed.data.email,
      customerPhone: parsed.data.phone,
      customerNote: parsed.data.note || null,
      deliveryMethod: parsed.data.deliveryMethod,
      shippingAddress: parsed.data.shippingAddress || null,
      shippingCity: parsed.data.shippingCity || null,
      shippingPostalCode: parsed.data.shippingPostalCode || null,
      subtotalCents: total,
      totalCents: total,
      paymentMethodId: method.id,
      expiresAt,
      items: {
        create: lines.map((l) => ({
          variantId: l.variantId,
          productName: l.productName,
          variantName: l.variantName,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          lineTotalCents: l.lineTotalCents,
        })),
      },
    },
  });

  // Efectivo, Cuenta DNI y cualquier otro medio manual no pasan por MP: el
  // pedido queda armado y se coordina el pago por fuera del sitio.
  if (!method.isOnline) {
    return { ok: true, orderNumber: order.number, initPoint: null };
  }

  // Si MP todavía no está configurado (falta el token), el pedido queda creado
  // igual y la página de pedido explica que el pago no está disponible aún.
  if (!isMercadoPagoConfigured()) {
    return { ok: true, orderNumber: order.number, initPoint: null };
  }

  try {
    const pref = await createPreference({
      orderId: order.id,
      orderNumber: order.number,
      items: lines.map((l) => ({
        title: `${l.productName}${l.variantName !== "Único" ? ` - ${l.variantName}` : ""}`,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
      })),
      payer: { name: parsed.data.name, email: parsed.data.email },
      baseUrl: baseUrl(),
    });

    // Registramos el intento de pago (PENDIENTE) para conciliar con el webhook.
    await db.payment.create({
      data: {
        orderId: order.id,
        paymentMethodId: method.id,
        status: "PENDIENTE",
        amountCents: total,
        providerStatus: "preference_created",
        rawPayload: { preferenceId: pref.preferenceId },
      },
    });

    return { ok: true, orderNumber: order.number, initPoint: pref.initPoint };
  } catch (err) {
    // El pedido ya existe; si MP falla, lo dejamos en la página de pedido con
    // el error, en vez de perder la compra.
    console.error("Error creando preferencia MP:", err);
    return { ok: true, orderNumber: order.number, initPoint: null };
  }
}
