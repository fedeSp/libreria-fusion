import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { expireStaleOrders } from "@/lib/orders";
import { startOfDayAR, endOfDayAR } from "@/lib/dates";
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
  searchParams: Promise<{ estado?: string; desde?: string; hasta?: string }>;
}) {
  const admin = await requireAdmin();
  await expireStaleOrders();
  const { estado, desde, hasta } = await searchParams;
  const active = FILTERS.find((f) => f.key === estado) ?? FILTERS[0];

  // El rango se interpreta en hora de Buenos Aires con las mismas funciones que
  // usa la exportación, así que la grilla y el CSV no pueden discrepar sobre
  // qué pedidos entran en un mes.
  const gte = startOfDayAR(desde ?? null);
  const lte = endOfDayAR(hasta ?? null);
  const createdAt = { ...(gte && { gte }), ...(lte && { lte }) };
  const hayRango = Object.keys(createdAt).length > 0;

  // Los links de estado tienen que conservar el rango, si no cambiar de solapa
  // lo borra sin que nadie lo haya pedido.
  const conFiltros = (key: string) => {
    const q = new URLSearchParams();
    if (key !== "todos") q.set("estado", key);
    if (desde) q.set("desde", desde);
    if (hasta) q.set("hasta", hasta);
    const qs = q.toString();
    return qs ? `/admin/pedidos?${qs}` : "/admin/pedidos";
  };

  const LIMITE = 100;
  const orders = await db.order.findMany({
    where: {
      ...(active.status && { status: active.status }),
      ...(hayRango && { createdAt }),
    },
    orderBy: { createdAt: "desc" },
    take: LIMITE,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink">Pedidos</h1>
        {/* Un solo form GET para las dos cosas: el botón de filtrar recarga la
            pantalla y el de exportar apunta a la ruta del CSV con formAction.
            Así el CSV sale siempre con el mismo recorte que se está viendo, y
            todo funciona sin JavaScript. */}
        <form
          action="/admin/pedidos"
          method="get"
          className="flex flex-wrap items-end gap-2"
        >
          {active.status && <input type="hidden" name="estado" value={active.key} />}
          <label className="text-xs text-muted">
            Desde
            <input
              type="date"
              name="desde"
              defaultValue={desde ?? ""}
              className="mt-0.5 block rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-brand"
            />
          </label>
          <label className="text-xs text-muted">
            Hasta
            <input
              type="date"
              name="hasta"
              defaultValue={hasta ?? ""}
              className="mt-0.5 block rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink focus:border-brand"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Filtrar
          </button>
          <button
            type="submit"
            formAction="/api/admin/export/pedidos"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Exportar CSV
          </button>
        </form>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={conFiltros(f.key)}
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

      <p className="mt-3 text-sm text-muted">
        {orders.length === LIMITE
          ? `Mostrando los ${LIMITE} más recientes`
          : `${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"}`}
        {hayRango && " en el rango elegido"}
        {hayRango && (
          <Link
            href={active.key === "todos" ? "/admin/pedidos" : `/admin/pedidos?estado=${active.key}`}
            className="ml-2 font-medium text-brand hover:underline"
          >
            Limpiar fechas
          </Link>
        )}
        {/* El listado corta en 100 pero el CSV no: si se llegó al tope, la
            planilla va a traer más filas que las que se ven acá. */}
        {orders.length === LIMITE && (
          <span className="ml-2">La exportación no tiene ese tope.</span>
        )}
      </p>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          {hayRango
            ? "No hay pedidos en ese rango de fechas."
            : "No hay pedidos en este estado."}
        </p>
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
