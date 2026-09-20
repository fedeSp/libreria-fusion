import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, whatsappUrl } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento",
  description:
    "Cancelá tu compra dentro de los 10 días corridos, sin costo y sin dar explicaciones, según la Resolución 424/2020.",
};

/**
 * Obligatorio por la Resolución 424/2020 de la Secretaría de Comercio Interior:
 * tiene que estar en la home, ser fácil de encontrar y permitir cancelar
 * la compra sin trabas. Por eso el link vive en el footer de todas las páginas.
 */
export default async function ArrepentimientoPage() {
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Botón de arrepentimiento</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold text-ink">
        Botón de arrepentimiento
      </h1>

      <div className="mt-5 space-y-4 leading-relaxed text-ink">
        <p>
          Si compraste online, tenés <strong>10 días corridos</strong> desde que
          recibís el producto para arrepentirte de la compra. No hace falta que
          des explicaciones y no tiene ningún costo para vos.
        </p>
        <p>
          Te devolvemos el importe por el mismo medio de pago que usaste. Si
          pagaste con Mercado Pago, la devolución se procesa por ahí y los
          tiempos de acreditación son los de tu banco o tarjeta.
        </p>
      </div>

      <section className="mt-8 rounded-xl border border-brand/25 bg-brand-softer p-6">
        <h2 className="font-bold text-ink">Para cancelar tu compra</h2>
        <p className="mt-2 text-sm text-muted">
          Mandanos un mensaje con estos datos y lo gestionamos:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink">
          <li>Número de pedido</li>
          <li>Nombre y apellido</li>
          <li>Email con el que hiciste la compra</li>
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={whatsappUrl(
              s["store.whatsapp"],
              "Hola, quiero ejercer el botón de arrepentimiento. Número de pedido:"
            )}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Cancelar por WhatsApp
          </a>
          <a
            href={`mailto:${s["store.email"]}?subject=${encodeURIComponent(
              "Botón de arrepentimiento"
            )}&body=${encodeURIComponent(
              "Número de pedido:\nNombre y apellido:\nEmail de la compra:\n"
            )}`}
            className="rounded-full border border-brand bg-white px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand-softer"
          >
            Cancelar por mail
          </a>
        </div>
      </section>

      <p className="mt-6 text-sm text-muted">
        Resolución 424/2020, Secretaría de Comercio Interior. Ante cualquier
        inconveniente podés reclamar en{" "}
        <a
          href="https://autogestion.produccion.gob.ar/consumidores"
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          Defensa de las y los Consumidores
        </a>
        .
      </p>
    </div>
  );
}
