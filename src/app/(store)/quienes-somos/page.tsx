import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Librería Fusión es una librería familiar de Villa Bosch, Tres de Febrero, con atención personalizada.",
};

export default async function QuienesSomosPage() {
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Quiénes somos</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold text-ink">Quiénes somos</h1>

      <div className="mt-5 space-y-4 leading-relaxed text-ink">
        <p>
          Somos una librería familiar que nació con la idea de acercar
          materiales escolares y productos comerciales de calidad a nuestro
          barrio. Trabajamos con artículos pensados para facilitar el
          aprendizaje y el trabajo de todos los días.
        </p>
        <p>
          Atendemos de forma personalizada: si no encontrás algo, preguntanos.
          Muchas veces lo tenemos en el local aunque todavía no esté publicado
          en la web, y si no lo tenemos lo conseguimos.
        </p>
        <p>
          Esta tienda online es una extensión del mostrador, no un reemplazo:
          elegís tranquilo desde casa y pasás a buscarlo cuando te queda cómodo.
        </p>
      </div>

      <section className="mt-8 rounded-xl border border-line bg-white p-6">
        <h2 className="font-bold text-ink">Dónde encontrarnos</h2>
        <p className="mt-2 text-sm text-ink">{s["store.address"]}</p>
        <p className="mt-1 text-sm text-muted">{s["store.hours"]}</p>
        <Link
          href="/contacto"
          className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Ver datos de contacto →
        </Link>
      </section>
    </div>
  );
}
