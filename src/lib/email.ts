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

// ---------------------------------------------------------------- al cliente
//
// Todo lo que le llega a quien compró. Comparten el mismo marco (encabezado,
// datos del local, pie) para que no haya que acordarse de repetir la dirección
// en cada plantilla y para que los tres mails se vean de la misma familia.

const VERDE = "#0b6b4a";

function filasDeItems(order: OrderForEmail): string {
  return order.items
    .map(
      (it) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0edf0">${it.quantity}× ${
          it.productName
        }${it.variantName !== "Único" ? ` (${it.variantName})` : ""}</td>` +
        `<td style="padding:6px 8px;text-align:right;border-bottom:1px solid #f0edf0">${formatPrice(
          it.lineTotalCents,
        )}</td></tr>`,
    )
    .join("");
}

async function marco(titulo: string, cuerpo: string): Promise<string> {
  const s = await getSettings();
  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#1f2430">
      <div style="background:#14275c;padding:18px 20px;border-radius:10px 10px 0 0">
        <span style="color:#3fbfa0;font-weight:800;font-size:19px">Librería</span>
        <span style="color:#ff6fb5;font-weight:800;font-size:19px">F</span><span style="color:#29b6e8;font-weight:800;font-size:19px">u</span><span style="color:#f5b301;font-weight:800;font-size:19px">s</span><span style="color:#3fbfa0;font-weight:800;font-size:19px">i</span><span style="color:#ff6fb5;font-weight:800;font-size:19px">ó</span><span style="color:#29b6e8;font-weight:800;font-size:19px">n</span>
      </div>
      <div style="border:1px solid #e7e2e6;border-top:0;border-radius:0 0 10px 10px;padding:22px 20px">
        <h2 style="margin:0 0 14px;font-size:19px;color:#c2185b">${titulo}</h2>
        ${cuerpo}
        <hr style="border:0;border-top:1px solid #e7e2e6;margin:22px 0 14px">
        <p style="margin:0;font-size:13px;color:#5b6472;line-height:1.6">
          ${s["store.address"]}<br>
          ${s["store.hours"]}<br>
          WhatsApp ${s["store.phone"]}
        </p>
      </div>
    </div>`;
}

/** El pago se acreditó. Es lo primero que recibe después de comprar. */
export async function notifyCustomerOrderPaid(order: OrderForEmail): Promise<void> {
  if (!order.customerEmail) return;

  const queSigue =
    order.deliveryMethod === "ENVIO_DOMICILIO"
      ? `<p style="margin:0 0 14px">Nos comunicamos con vos para coordinar el envío a <strong>${order.shippingAddress}, ${order.shippingCity}</strong>.</p>`
      : `<p style="margin:0 0 14px">Lo estamos preparando. <strong>Te vamos a avisar por este mismo medio cuando esté listo</strong> para que pases a retirarlo; no hace falta que vengas antes.</p>`;

  const html = await marco(
    `¡Gracias por tu compra, ${order.customerName.split(" ")[0]}!`,
    `<p style="margin:0 0 14px">Recibimos tu pago del pedido <strong>#${order.number}</strong>.</p>
     ${queSigue}
     <table style="border-collapse:collapse;width:100%;font-size:14px;margin-top:6px">${filasDeItems(order)}
       <tr><td style="padding:8px;font-weight:bold">Total</td>
       <td style="padding:8px;text-align:right;font-weight:bold">${formatPrice(order.totalCents)}</td></tr>
     </table>`,
  );

  await send(order.customerEmail, `Recibimos tu pedido #${order.number} — Librería Fusión`, html);
}

/** El pedido está armado. Para una tienda de retiro, este es EL mail. */
export async function notifyCustomerOrderReady(order: OrderForEmail): Promise<void> {
  if (!order.customerEmail) return;
  const s = await getSettings();

  const cuerpo =
    order.deliveryMethod === "ENVIO_DOMICILIO"
      ? `<p style="margin:0 0 14px">Tu pedido <strong>#${order.number}</strong> ya está armado. Nos comunicamos con vos para coordinar la entrega.</p>`
      : `<p style="margin:0 0 14px">Tu pedido <strong>#${order.number}</strong> ya está armado y te espera en el local.</p>
         <div style="background:#fde7f0;border-radius:8px;padding:14px 16px;margin:0 0 14px">
           <p style="margin:0;font-weight:bold;color:${VERDE}">Pasá a retirarlo por</p>
           <p style="margin:4px 0 0">${s["store.address"]}</p>
           <p style="margin:4px 0 0;font-size:13px;color:#5b6472">${s["store.hours"]}</p>
         </div>
         <p style="margin:0 0 14px;font-size:13px;color:#5b6472">${s["pickup.detail"]}</p>`;

  const html = await marco(
    "¡Tu pedido está listo!",
    cuerpo +
      `<table style="border-collapse:collapse;width:100%;font-size:14px">${filasDeItems(order)}</table>`,
  );

  await send(order.customerEmail, `Tu pedido #${order.number} está listo para retirar`, html);
}

/**
 * El pedido se canceló.
 *
 * Solo hay dos casos, y la diferencia es si hay plata para devolver. Con
 * Mercado Pago el cobro ya ocurrió y el reembolso sale solo, así que hay que
 * contarlo. En cualquier otro caso —efectivo, o un pedido que nunca se pagó—
 * el cliente todavía no puso un peso: ahí el aviso es que se canceló y nada
 * más. Explicar de menos es mejor que explicar de más.
 */
export async function notifyCustomerOrderCancelled(
  order: OrderForEmail,
  reembolsado: boolean,
): Promise<void> {
  if (!order.customerEmail) return;
  const s = await getSettings();

  const devolucion = reembolsado
    ? `<div style="background:#fde7f0;border-radius:8px;padding:14px 16px;margin:0 0 14px">
        <p style="margin:0;font-weight:bold;color:${VERDE}">Te devolvimos ${formatPrice(order.totalCents)}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#5b6472">La devolución sale por Mercado Pago, con el mismo medio con el que pagaste. Según tu banco o tarjeta puede tardar algunos días hábiles en aparecer.</p>
      </div>`
    : "";

  const html = await marco(
    `Se canceló tu pedido #${order.number}`,
    `<p style="margin:0 0 14px">Hola ${order.customerName.split(" ")[0]}, tu pedido quedó cancelado.</p>
     ${devolucion}
     <p style="margin:0;font-size:13px;color:#5b6472">Si tenés alguna duda respondé este mail o escribinos al WhatsApp ${s["store.phone"]}.</p>`,
  );

  await send(order.customerEmail, `Se canceló tu pedido #${order.number}`, html);
}
