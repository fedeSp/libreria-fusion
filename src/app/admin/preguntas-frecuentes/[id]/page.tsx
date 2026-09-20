import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { FaqForm } from "@/components/faq-form";
import { FaqDeleteButton } from "@/components/faq-delete-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar pregunta", robots: { index: false } };

export default async function EditarPregunta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const faq = await db.faq.findUnique({ where: { id } });
  if (!faq) notFound();

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/preguntas-frecuentes" className="text-sm text-brand hover:underline">
        ← Volver a preguntas frecuentes
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Editar pregunta</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_12rem]">
        <FaqForm
          faqId={faq.id}
          initial={{
            question: faq.question,
            answer: faq.answer,
            position: faq.position,
            isActive: faq.isActive,
          }}
        />
        <aside>
          <h2 className="text-sm font-bold text-ink">Baja</h2>
          <div className="mt-2">
            <FaqDeleteButton id={faq.id} />
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
