import "server-only";

// Capa fina sobre la API de Mercado Pago (Checkout Pro, vía Preferences).
// Todo lo que sabe de MP vive acá; el resto del código habla de "pedido" y
// "preferencia", no de detalles del proveedor. Si mañana se cambia a Bricks o
// a otro medio, se toca solo este archivo.

const MP_API = "https://api.mercadopago.com";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

export type PreferenceItem = {
  title: string;
  quantity: number;
  unitPriceCents: number;
};

export type CreatePreferenceInput = {
  orderId: string;
  orderNumber: number;
  items: PreferenceItem[];
  payer: { name: string; email: string };
  // URL pública base (https://zestech.com.ar/libreria) para armar los retornos.
  baseUrl: string;
};

export type PreferenceResult = {
  preferenceId: string;
  initPoint: string;
};

export async function createPreference(
  input: CreatePreferenceInput,
): Promise<PreferenceResult> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado");

  const backUrl = `${input.baseUrl}/pedido/${input.orderNumber}`;

  const body = {
    items: input.items.map((it, i) => ({
      id: String(i),
      title: it.title,
      quantity: it.quantity,
      currency_id: "ARS",
      // MP espera el precio en pesos (unidad mayor), no en centavos.
      unit_price: it.unitPriceCents / 100,
    })),
    payer: {
      name: input.payer.name,
      email: input.payer.email,
    },
    // Referencia propia para reconciliar el webhook con nuestro pedido.
    external_reference: input.orderId,
    back_urls: {
      success: `${backUrl}?pago=exito`,
      pending: `${backUrl}?pago=pendiente`,
      failure: `${backUrl}?pago=error`,
    },
    auto_return: "approved",
    notification_url: `${input.baseUrl}/api/mp/webhook`,
    statement_descriptor: "LIBRERIA FUSION",
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`MP preference falló (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    id: string;
    init_point: string;
    sandbox_init_point: string;
  };

  // Con credenciales de prueba MP igual devuelve init_point válido para el
  // flujo de test; usamos ese siempre.
  return { preferenceId: data.id, initPoint: data.init_point };
}

// Reembolsa un pago por completo. Se usa al cancelar un pedido ya pagado: el
// cliente no puede quedar cobrado sin producto. Idempotency-Key evita que un
// reintento genere dos reembolsos.
export async function refundPayment(
  paymentId: string,
): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "MP_ACCESS_TOKEN no configurado" };

  const res = await fetch(`${MP_API}/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `refund-${paymentId}`,
    },
    // Cuerpo vacío = reembolso total.
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, error: `MP refund falló (${res.status}): ${detail}` };
  }
  const data = (await res.json()) as { id: number };
  return { ok: true, refundId: String(data.id) };
}

// Consulta el estado real de un pago. El webhook nos avisa que "algo pasó" con
// un id; vamos a MP a preguntar el estado autoritativo en vez de confiar en el
// payload, que puede llegar incompleto o fuera de orden.
export async function getPayment(paymentId: string): Promise<{
  id: string;
  status: string;
  externalReference: string | null;
  amountCents: number;
} | null> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado");

  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const p = (await res.json()) as {
    id: number;
    status: string;
    external_reference: string | null;
    transaction_amount: number;
  };
  return {
    id: String(p.id),
    status: p.status,
    externalReference: p.external_reference,
    amountCents: Math.round(p.transaction_amount * 100),
  };
}
