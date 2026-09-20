import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { getSettings, whatsappUrl } from "@/lib/settings";
import { expireStaleOrders } from "@/lib/orders";
import { PickupNotice } from "@/components/pickup-notice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tu pedido" };

type Props = {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ pago?: string }>;
};

// Copys por estado del pedido, para no llenar el JSX de condicionales.
const STATUS_UI: Record<
  string,
  { title: string; tone: "ok" | "wait" | "bad"; text: string }
> = {
  PENDIENTE_PAGO: {
    title: "Pedido registrado, falta el pago",
    tone: "wait",
    text: "Todavía no nos llegó la confirmación del pago. Si ya pagaste, puede tardar unos minutos en acreditarse.",
  },
  PAGADO: {
    title: "¡Pago confirmado!",
    tone: "ok",
    text: "Ya recibimos tu pago. Estamos preparando tu pedido y te avisamos cuando puedas venir a retirarlo.",
  },
  EN_PREPARACION: {
    title: "Estamos preparando tu pedido",
    tone: "ok",
    text: "Lo estamos armando. Te avisamos apenas esté listo para retirar.",
  },
  LISTO_PARA_RETIRAR: {
    title: "¡Tu pedido está listo!",
    tone: "ok",
    text: "Podés pasar a retirarlo en el horario de atención. Llevá tu número de pedido.",
  },
  ENTREGADO: {
    title: "Pedido entregado",
    tone: "ok",
    text: "Este pedido ya fue retirado. ¡Gracias por tu compra!",
  },
  CANCELADO: {
    title: "Pedido cancelado",
    tone: "bad",
    text: "Este pedido se canceló. Si creés que es un error, escribinos.",
  },
};

export default async function PedidoPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { pago } = await searchParams;
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();

  await expireStaleOrders();

  const order = await db.order.findUnique({
    where: { number: n },
    include: { items: true },
  });
  if (!order) notFound();

  const settings = await getSettings();
  const ui = STATUS_UI[order.status] ?? STATUS_UI.PENDIENTE_PAGO;
  const toneClass =
    ui.tone === "ok"
      ? "border-success/30 bg-success/5"
      : ui.tone === "bad"
        ? "border-danger/30 bg-danger/5"
        : "border-brand/30 bg-brand-softer";

  // Aviso extra si MP nos mandó de vuelta con un resultado en la URL.
  const returnMsg =
    pago === "error"
      ? "El pago no se completó. Podés intentar de nuevo desde el carrito."
      : pago === "pendiente"
        ? "Tu pago quedó pendiente de acreditación. Te avisamos cuando se confirme."
        : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-muted">Pedido</p>
      <h1 className="text-3xl font-extrabold text-brand">#{order.number}</h1>

      <div className={`mt-5 rounded-xl border p-5 ${toneClass}`}>
        <h2 className="font-bold text-ink">{ui.title}</h2>
        <p className="mt-1 text-sm text-muted">{ui.text}</p>
        {returnMsg && (
          <p className="mt-2 text-sm font-medium text-ink">{returnMsg}</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        <h2 className="text-sm font-bold text-ink">Detalle</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2">
              <span className="text-muted">
                {it.quantity}× {it.productName}
                {it.variantName !== "Único" && ` (${it.variantName})`}
              </span>
              <span className="shrink-0 text-ink">
                {formatPrice(it.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-semibold text-ink">Total</span>
          <span className="text-lg font-extrabold text-brand">
            {formatPrice(order.totalCents)}
          </span>
        </div>
      </div>

      <div className="mt-6">
        {order.deliveryMethod === "ENVIO_DOMICILIO" ? (
          <aside className="rounded-xl border border-brand/25 bg-brand-softer p-4">
            <p className="flex items-start gap-2 text-sm font-semibold text-brand">
              <span aria-hidden="true">📦</span>
              <span>Envío a domicilio</span>
            </p>
            <p className="mt-1 pl-6 text-sm text-muted">
              Te contactamos por WhatsApp para coordinar el costo y el medio de envío.
            </p>
            <p className="mt-1 pl-6 text-sm text-muted">
              Dirección: <span className="text-ink">{order.shippingAddress}</span>,{" "}
              {order.shippingCity} (CP {order.shippingPostalCode})
            </p>
          </aside>
        ) : (
          <PickupNotice />
        )}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-5 text-sm">
        <p className="text-ink">
          Guardá tu número de pedido <strong>#{order.number}</strong>. Ante
          cualquier duda escribinos:
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href={whatsappUrl(
              settings["store.whatsapp"],
              `Hola, consulto por mi pedido #${order.number}.`,
            )}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Escribir por WhatsApp
          </a>
          <Link
            href="/productos"
            className="rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand-softer"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
