import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { FaqForm } from "@/components/faq-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva pregunta", robots: { index: false } };

export default async function NuevaPregunta() {
  const admin = await requireAdmin();

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/preguntas-frecuentes" className="text-sm text-brand hover:underline">
        ← Volver a preguntas frecuentes
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Nueva pregunta</h1>
      <div className="mt-6">
        <FaqForm />
      </div>
    </AdminShell>
  );
}
