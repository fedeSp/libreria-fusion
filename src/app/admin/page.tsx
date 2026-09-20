import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { getAlerts } from "@/lib/alerts";
import { expireStaleOrders } from "@/lib/orders";
import { CONFIRMED_ORDER_STATUSES } from "@/lib/sales";
import { AdminShell } from "@/components/admin-shell";
import { AdminAlerts } from "@/components/admin-alerts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel", robots: { index: false } };

export default async function AdminHome() {
  const admin = await requireAdmin();

  // Antes de contar nada: si no se espera esto, corre en paralelo con el
  // conteo de "Esperando pago" de abajo y puede llegar tarde.
  await expireStaleOrders();

  const [alerts, aPreparar, listos, pendientes, productos, ventas] =
    await Promise.all([
      getAlerts(),
      db.order.count({ where: { status: { in: ["PAGADO", "EN_PREPARACION"] } } }),
      db.order.count({ where: { status: "LISTO_PARA_RETIRAR" } }),
      db.order.count({ where: { status: "PENDIENTE_PAGO" } }),
      db.product.count({ where: { isActive: true } }),
      db.order.aggregate({
        _sum: { totalCents: true },
        where: { status: { in: CONFIRMED_ORDER_STATUSES } },
      }),
    ]);

  const cards = [
    { label: "A preparar", value: aPreparar, href: "/admin/pedidos?estado=PAGADO" },
    { label: "Listos para retirar", value: listos, href: "/admin/pedidos?estado=LISTO_PARA_RETIRAR" },
    { label: "Esperando pago", value: pendientes, href: "/admin/pedidos?estado=PENDIENTE_PAGO" },
    { label: "Productos activos", value: productos, href: "/admin/productos" },
  ];

  return (
    <AdminShell adminName={admin.name}>
      <h1 className="text-2xl font-extrabold text-ink">
        Hola, {admin.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-muted">Esto es lo que necesita tu atención.</p>

      <section className="mt-5">
        <h2 className="sr-only">Alertas</h2>
        <AdminAlerts alerts={alerts} />
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-line bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
          >
            <p className="text-3xl font-extrabold text-ink">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/admin/ventas"
        className="mt-4 block rounded-xl border border-line bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
      >
        <p className="text-sm text-muted">Total vendido (pagos confirmados)</p>
        <p className="mt-1 text-2xl font-extrabold text-brand">
          {formatPrice(ventas._sum.totalCents ?? 0)}
        </p>
        <p className="mt-1 text-xs text-muted">Ver panel de ventas →</p>
      </Link>
    </AdminShell>
  );
}
