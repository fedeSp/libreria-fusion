import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTimeAR } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Imprimir pedido", robots: { index: false } };

export default async function ImprimirPedido({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  await requireAdmin();
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n)) notFound();

  const order = await db.order.findUnique({
    where: { number: n },
    include: { items: true, paymentMethod: true },
  });
  if (!order) notFound();

  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-sm bg-paper px-4 py-6 print:max-w-none print:bg-white print:p-0">
      {/* @page en vez de clase: es el único lugar donde se puede fijar el
          tamaño/margen de la hoja impresa. Angosto por si se imprime en una
          impresora térmica de ticket; en hoja A4/carta igual entra bien. */}
      <style>{`@media print { @page { size: 80mm auto; margin: 4mm; } }`}</style>

      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/pedidos/${order.number}`} className="text-sm text-brand hover:underline">
          ← Volver al pedido
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-line bg-white p-5 text-sm print:rounded-none print:border-0 print:p-0">
        <div className="text-center">
          <p className="text-base font-extrabold text-brand">{settings["store.name"]}</p>
          <p className="text-xs text-muted">{settings["store.address"]}</p>
          <p className="text-xs text-muted">{settings["store.phone"]}</p>
        </div>

        <div className="mt-3 border-t border-dashed border-line pt-3 text-center">
          <p className="text-xl font-extrabold text-ink">Pedido #{order.number}</p>
          <p className="text-xs text-muted">{formatDateTimeAR(order.createdAt)}</p>
        </div>

        <div className="mt-3 border-t border-dashed border-line pt-3">
          <p className="font-semibold text-ink">{order.customerName}</p>
          <p className="text-muted">{order.customerPhone}</p>
          {order.deliveryMethod === "ENVIO_DOMICILIO" ? (
            <div className="mt-2">
              <p className="font-semibold text-ink">📦 Envío a domicilio</p>
              <p className="text-muted">{order.shippingAddress}</p>
              <p className="text-muted">
                {order.shippingCity} — CP {order.shippingPostalCode}
              </p>
            </div>
          ) : (
            <p className="mt-2 font-semibold text-ink">🏬 Retira en el local</p>
          )}
        </div>

        <div className="mt-3 border-t border-dashed border-line pt-3">
          <ul className="space-y-1">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span className="text-ink">
                  {it.quantity}× {it.productName}
                  {it.variantName !== "Único" && ` (${it.variantName})`}
                </span>
                <span className="shrink-0 text-ink">{formatPrice(it.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-line pt-2 font-bold text-ink">
            <span>Total</span>
            <span>{formatPrice(order.totalCents)}</span>
          </div>
        </div>

        <div className="mt-3 border-t border-dashed border-line pt-3 text-xs text-muted">
          <p>Medio de pago: {order.paymentMethod?.label ?? "—"}</p>
          {order.customerNote && <p className="mt-1">Nota: "{order.customerNote}"</p>}
        </div>
      </div>
    </div>
  );
}
