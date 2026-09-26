import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTimeAR } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { whatsappUrl, getSettings } from "@/lib/settings";
import { ESTADOS_PAGADOS, TRANSICIONES, expireStaleOrders } from "@/lib/orders";
import { AdminShell } from "@/components/admin-shell";
import { StatusBadge } from "@/components/order-status";
import { OrderActions } from "@/components/order-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedido", robots: { index: false } };

export default async function PedidoDetalle({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const admin = await requireAdmin();
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();

  await expireStaleOrders();

  const order = await db.order.findUnique({
    where: { number: n },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } }, paymentMethod: true },
  });
  if (!order) notFound();

  const settings = await getSettings();

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/pedidos" className="text-sm text-brand hover:underline">
        ← Volver a pedidos
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold text-ink">Pedido #{order.number}</h1>
        <StatusBadge status={order.status} />
        <Link
          href={`/admin/pedidos/${order.number}/imprimir`}
          target="_blank"
          className="ml-auto rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand hover:text-brand"
        >
          🖨️ Imprimir pedido
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Creado el {formatDateTimeAR(order.createdAt)}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-bold text-ink">Cambiar estado</h2>
            <div className="mt-3">
              <OrderActions
                orderId={order.id}
                next={TRANSICIONES[order.status]}
                // Solo hay reembolso automático si la plata entró por Mercado
                // Pago. Con pago en el local no se cobró nada todavía, así que
                // el cartel de confirmación no debe prometer una devolución.
                reembolsable={
                  ESTADOS_PAGADOS.includes(order.status) &&
                  (order.paymentMethod?.isOnline ?? false)
                }
              />
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-bold text-ink">Detalle</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-muted">
                    {it.quantity}× {it.productName}
                    {it.variantName !== "Único" && ` (${it.variantName})`}
                  </span>
                  <span className="shrink-0 text-ink">{formatPrice(it.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3">
              <span className="font-semibold text-ink">Total</span>
              <span className="text-lg font-extrabold text-brand">
                {formatPrice(order.totalCents)}
              </span>
            </div>
          </section>

          {order.payments.length > 0 && (
            <section className="rounded-xl border border-line bg-white p-5">
              <h2 className="text-sm font-bold text-ink">Pagos</h2>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>
                      {p.status}
                      {p.providerPaymentId && ` · MP ${p.providerPaymentId}`}
                    </span>
                    <span>{formatPrice(p.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-4">
          <div className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-sm font-bold text-ink">Cliente</h2>
            <p className="mt-2 text-sm text-ink">{order.customerName}</p>
            <p className="text-sm text-muted">{order.customerEmail}</p>
            <p className="text-sm text-muted">{order.customerPhone}</p>
            {order.customerNote && (
              <p className="mt-2 rounded-lg bg-paper p-2 text-sm text-ink">
                “{order.customerNote}”
              </p>
            )}
            <a
              href={whatsappUrl(
                settings["store.whatsapp"],
                `Hola ${order.customerName}, te escribimos por tu pedido #${order.number} de Librería Fusión.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
            >
              Escribir al cliente
            </a>
          </div>

          <div className="rounded-xl border border-line bg-white p-5 text-sm">
            <h2 className="font-bold text-ink">Entrega</h2>
            {order.deliveryMethod === "ENVIO_DOMICILIO" ? (
              <>
                <p className="mt-1 font-semibold text-brand">📦 Envío a domicilio</p>
                <p className="mt-1 text-ink">{order.shippingAddress}</p>
                <p className="text-muted">
                  {order.shippingCity} — CP {order.shippingPostalCode}
                </p>
              </>
            ) : (
              <p className="mt-1 text-muted">🏬 Retira en el local</p>
            )}
          </div>

          <div className="rounded-xl border border-line bg-white p-5 text-sm">
            <h2 className="font-bold text-ink">Pago</h2>
            <p className="mt-1 text-muted">
              Método: {order.paymentMethod?.label ?? "—"}
            </p>
            {order.paymentMethod?.code === "cuenta-dni" && !order.paidAt && (
              <p className="mt-2 rounded-lg bg-brand-softer p-2 text-xs text-brand">
                Generá el link desde la app Cuenta DNI Comercios por {formatPrice(order.totalCents)}{" "}
                y mandaselo al cliente. Marcá "Pagado" cuando se acredite.
              </p>
            )}
            {order.paidAt && (
              <p className="text-muted">Pagado: {formatDateTimeAR(order.paidAt)}</p>
            )}
            {order.pickedUpAt && (
              <p className="text-muted">Retirado: {formatDateTimeAR(order.pickedUpAt)}</p>
            )}
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
