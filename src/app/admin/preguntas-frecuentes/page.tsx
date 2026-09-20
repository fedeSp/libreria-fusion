import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { FaqToggle } from "@/components/faq-toggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preguntas frecuentes", robots: { index: false } };

export default async function PreguntasFrecuentesAdmin() {
  const admin = await requireAdmin();
  const faqs = await db.faq.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });

  return (
    <AdminShell adminName={admin.name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-extrabold text-ink">Preguntas frecuentes</h1>
          <span className="text-sm text-muted">{faqs.length} en total</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/preguntas-frecuentes" target="_blank" className="text-sm text-brand hover:underline">
            Ver en la tienda ↗
          </Link>
          <Link
            href="/admin/preguntas-frecuentes/nueva"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Nueva pregunta
          </Link>
        </div>
      </div>

      {faqs.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Todavía no cargaste ninguna pregunta.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Pregunta</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {faqs.map((f) => (
                <tr key={f.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/preguntas-frecuentes/${f.id}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {f.question}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <FaqToggle id={f.id} isActive={f.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/preguntas-frecuentes/${f.id}`}
                      className="text-sm font-semibold text-brand hover:underline"
                    >
                      Editar
                    </Link>
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
