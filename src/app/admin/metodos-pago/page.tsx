import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { PaymentMethodToggle } from "@/components/payment-method-toggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Medios de pago", robots: { index: false } };

export default async function MetodosPagoAdmin() {
  const admin = await requireAdmin();
  const methods = await db.paymentMethod.findMany({ orderBy: { position: "asc" } });

  return (
    <AdminShell adminName={admin.name}>
      <h1 className="text-2xl font-extrabold text-ink">Medios de pago</h1>
      <p className="mt-1 text-sm text-muted">
        Solo los activos aparecen como opción en el checkout de la tienda.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Medio</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {methods.map((m) => (
              <tr key={m.id} className="hover:bg-paper">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{m.label}</p>
                  {m.description && <p className="text-xs text-muted">{m.description}</p>}
                </td>
                <td className="px-4 py-3 text-muted">
                  {m.isOnline ? "Online (Mercado Pago)" : "Manual"}
                </td>
                <td className="px-4 py-3">
                  <PaymentMethodToggle id={m.id} isActive={m.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
