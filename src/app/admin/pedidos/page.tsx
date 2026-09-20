import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { expireStaleOrders } from "@/lib/orders";
import { AdminShell } from "@/components/admin-shell";
import { StatusBadge } from "@/components/order-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedidos", robots: { index: false } };

const FILTERS: { key: string; label: string; status?: OrderStatus }[] = [
  { key: "todos", label: "Todos" },
  { key: "PAGADO", label: "Pagados", status: "PAGADO" },
  { key: "EN_PREPARACION", label: "En preparación", status: "EN_PREPARACION" },
  { key: "LISTO_PARA_RETIRAR", label: "Listos", status: "LISTO_PARA_RETIRAR" },
  { key: "ENTREGADO", label: "Entregados", status: "ENTREGADO" },
  { key: "PENDIENTE_PAGO", label: "Esperando pago", status: "PENDIENTE_PAGO" },
  { key: "CANCELADO", label: "Cancelados", status: "CANCELADO" },
];

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const admin = await requireAdmin();
  await expireStaleOrders();
  const { estado } = await searchParams;
  const active = FILTERS.find((f) => f.key === estado) ?? FILTERS[0];

  const orders = await db.order.findMany({
    where: active.status ? { status: active.status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      number: true,
      customerName: true,
      status: true,
      totalCents: true,
      createdAt: true,
      deliveryMethod: true,
      _count: { select: { items: true } },
    },
  });

  return (
    <AdminShell adminName={admin.name}>
      <h1 className="text-2xl font-extrabold text-ink">Pedidos</h1>

      <nav className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "todos" ? "/admin/pedidos" : `/admin/pedidos?estado=${f.key}`}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              active.key === f.key
                ? "border-brand bg-brand text-white"
                : "border-line text-ink hover:border-brand"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No hay pedidos en este estado.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Entrega</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/pedidos/${o.number}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      #{o.number}
                    </Link>
                    <span className="ml-1 text-xs text-muted">
                      ({o._count.items} {o._count.items === 1 ? "ítem" : "ítems"})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink">{o.customerName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-muted" title={o.deliveryMethod === "ENVIO_DOMICILIO" ? "Envío a domicilio" : "Retira en el local"}>
                    {o.deliveryMethod === "ENVIO_DOMICILIO" ? "📦" : "🏬"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatPrice(o.totalCents)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {o.createdAt.toLocaleDateString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
