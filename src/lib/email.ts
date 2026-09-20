import "server-only";
import nodemailer from "nodemailer";
import { formatPrice } from "./money";
import { getSettings } from "./settings";

// Envío de mails transaccionales.
//
// El SWITCH es SMTP_PASS: todo lo demás (host, puerto, usuario) tiene defaults
// de Gmail, así que para prender los mails alcanza con agregar la contraseña de
// aplicación de Gmail en SMTP_PASS. Sin ella, no se manda nada y no se cae nada.

const SMTP = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  // El usuario SMTP de Gmail es la propia casilla; por defecto, la de la tienda.
  user: process.env.SMTP_USER || "fusionlibreriapapelera@gmail.com",
  pass: process.env.SMTP_PASS || "",
};

export function isEmailConfigured(): boolean {
  return Boolean(SMTP.pass);
}

function transport() {
  return nodemailer.createTransport({
    host: SMTP.host,
    port: SMTP.port,
    secure: SMTP.port === 465, // 465 = SSL; 587 = STARTTLS
    auth: { user: SMTP.user, pass: SMTP.pass },
  });
}

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn("[email] SMTP no configurado, no se envía:", subject);
    return;
  }
  const from = process.env.SMTP_FROM || `Librería Fusión <${SMTP.user}>`;
  await transport().sendMail({ from, to, subject, html });
}

type OrderForEmail = {
  number: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNote: string | null;
  deliveryMethod: "RETIRO_LOCAL" | "ENVIO_DOMICILIO";
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  totalCents: number;
  items: { productName: string; variantName: string; quantity: number; lineTotalCents: number }[];
};

// Avisa al local que entró una compra pagada, con todo lo necesario para
// prepararla. Se dispara desde el webhook cuando el pago se confirma.
export async function notifyAdminNewOrder(order: OrderForEmail): Promise<void> {
  const settings = await getSettings();
  const to = process.env.ADMIN_NOTIFY_EMAIL || settings["store.email"];
  if (!to) return;

  const rows = order.items
    .map(
      (it) =>
        `<tr><td style="padding:4px 8px">${it.quantity}× ${it.productName}${
          it.variantName !== "Único" ? ` (${it.variantName})` : ""
        }</td><td style="padding:4px 8px;text-align:right">${formatPrice(
          it.lineTotalCents,
        )}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;color:#1f2430">
      <h2 style="color:#c2185b">Nueva compra pagada · Pedido #${order.number}</h2>
      <p>Entró un pedido pagado. Datos para prepararlo y avisar cuando esté listo:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}
        <tr><td style="padding:8px;font-weight:bold;border-top:1px solid #e7e2e6">Total</td>
        <td style="padding:8px;text-align:right;font-weight:bold;border-top:1px solid #e7e2e6">${formatPrice(
          order.totalCents,
        )}</td></tr>
      </table>
      <h3 style="margin-bottom:4px">Cliente</h3>
      <p style="margin:0">${order.customerName}<br>${order.customerEmail}<br>${order.customerPhone}</p>
      ${order.customerNote ? `<p style="margin-top:8px"><em>“${order.customerNote}”</em></p>` : ""}
      ${
        order.deliveryMethod === "ENVIO_DOMICILIO"
          ? `<p style="color:#c2185b;font-size:13px;margin-top:16px;font-weight:bold">📦 Envío a domicilio: ${order.shippingAddress}, ${order.shippingCity} (CP ${order.shippingPostalCode})</p>`
          : `<p style="color:#5b6472;font-size:13px;margin-top:16px">🏬 El cliente retira en el local. Avisale por WhatsApp o mail cuando esté listo.</p>`
      }
    </div>`;

  await send(to, `🛒 Pedido #${order.number} pagado — Librería Fusión`, html);
}
