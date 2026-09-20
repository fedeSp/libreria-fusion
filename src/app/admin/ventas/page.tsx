import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/money";
import { getSalesDashboard, type RangeDays } from "@/lib/sales";
import { AdminShell } from "@/components/admin-shell";
import { SalesBarChart } from "@/components/sales-bar-chart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ventas", robots: { index: false } };

const RANGES: { key: RangeDays; label: string }[] = [
  { key: 7, label: "Últimos 7 días" },
  { key: 30, label: "Últimos 30 días" },
  { key: 90, label: "Últimos 90 días" },
];

function isRangeDays(value: number): value is RangeDays {
  return value === 7 || value === 30 || value === 90;
}

function DeltaTag({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const rounded = Math.round(pct);
  if (rounded === 0) return <span className="text-xs font-medium text-muted">= período anterior</span>;
  const up = rounded > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-success" : "text-danger"}`}>
      {up ? "↑" : "↓"} {Math.abs(rounded)}% vs. período anterior
    </span>
  );
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const admin = await requireAdmin();
  const { rango } = await searchParams;
  const parsed = Number(rango);
  const days: RangeDays = isRangeDays(parsed) ? parsed : 30;

  const data = await getSalesDashboard(days);

  const tiles = [
    { label: "Vendido", value: formatPrice(data.totalCents), delta: data.totalDeltaPct },
    { label: "Pedidos", value: String(data.orderCount), delta: data.orderCountDeltaPct },
    { label: "Ticket promedio", value: formatPrice(data.avgTicketCents), delta: null },
    { label: "Unidades vendidas", value: String(data.itemsSold), delta: null },
  ];

  return (
    <AdminShell adminName={admin.name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-ink">Ventas</h1>
        <nav className="flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/ventas?rango=${r.key}`}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                days === r.key
                  ? "border-brand bg-brand text-white"
                  : "border-line text-ink hover:border-brand"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-white p-5">
            <p className="text-sm text-muted">{t.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{t.value}</p>
            <div className="mt-1 h-4">
              <DeltaTag pct={t.delta} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold text-ink">Ventas por día</h2>
        <div className="mt-4">
          <SalesBarChart data={data.byDay} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Más vendidos</h2>
          {data.topProducts.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No hay ventas en este período.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 text-right font-medium">Unidades</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.topProducts.map((p) => (
                  <tr key={p.name}>
                    <td className="py-2 pr-2 text-ink">{p.name}</td>
                    <td className="py-2 text-right text-muted">{p.quantity}</td>
                    <td className="py-2 text-right font-semibold text-ink">
                      {formatPrice(p.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold text-ink">Medios de pago</h2>
          {data.byPaymentMethod.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No hay ventas en este período.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {data.byPaymentMethod.map((m) => {
                const share = data.totalCents > 0 ? (m.totalCents / data.totalCents) * 100 : 0;
                return (
                  <div key={m.label}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-ink">{m.label}</span>
                      <span className="text-muted">
                        {formatPrice(m.totalCents)} · {Math.round(share)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-brand-soft">
                      <div
                        className="h-2 rounded-full bg-brand"
                        style={{ width: `${Math.max(share, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
