import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Envíos, retiro, medios de pago y todo lo que necesitás saber antes de comprar.",
};

export default async function PreguntasFrecuentesPage() {
  const faqs = await db.faq.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Preguntas frecuentes</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold text-ink">Preguntas frecuentes</h1>

      {faqs.length === 0 ? (
        <p className="mt-6 text-muted">
          Todavía no cargamos preguntas.{" "}
          <Link href="/contacto" className="text-brand hover:underline">
            Consultanos
          </Link>{" "}
          lo que necesites.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-line rounded-xl border border-line bg-white">
          {faqs.map((f) => (
            <details key={f.id} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                {f.question}
                <span aria-hidden="true" className="shrink-0 text-brand group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.answer}</p>
            </details>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-muted">
        ¿No encontraste lo que buscabas?{" "}
        <Link href="/contacto" className="text-brand hover:underline">
          Escribinos
        </Link>
        .
      </p>
    </div>
  );
}
