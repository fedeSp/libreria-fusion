import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, whatsappUrl } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Cambios y devoluciones",
  description:
    "Política de cambios y devoluciones de Librería Fusión, según las leyes 24.240 y 26.361.",
};

export default async function DevolucionesPage() {
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Cambios y devoluciones</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold text-ink">
        Cambios y devoluciones
      </h1>

      <div className="mt-5 space-y-4 leading-relaxed text-ink">
        <p>
          En Librería Fusión nos regimos por lo establecido en las leyes 24.240
          y 26.361 de Defensa del Consumidor y demás disposiciones concordantes.
        </p>

        <h2 className="pt-2 text-lg font-bold">Condiciones</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>
            Los productos deben devolverse en las mismas condiciones en que
            fueron entregados, sin uso.
          </li>
          <li>
            Tienen que venir con su embalaje original y en perfecto estado de
            conservación, con los accesorios, manuales e instructivos que
            correspondan.
          </li>
          <li>
            Si recibiste un producto equivocado por un error nuestro, el embalaje
            debe estar intacto y sin abrir. En ese caso el cambio corre por
            nuestra cuenta.
          </li>
        </ul>

        <h2 className="pt-2 text-lg font-bold">Cómo hacerlo</h2>
        <p className="text-sm">
          Escribinos por WhatsApp o mail con tu número de pedido y contanos qué
          pasó. Coordinamos y traés el producto al local: como no hacemos envíos,
          los cambios y devoluciones también se resuelven en el mostrador.
        </p>

        <h2 className="pt-2 text-lg font-bold">Derecho de arrepentimiento</h2>
        <p className="text-sm">
          Si comprás online tenés 10 días corridos desde que recibís el producto
          para arrepentirte, sin dar explicaciones y sin costo.{" "}
          <Link href="/arrepentimiento" className="text-brand hover:underline">
            Ejercer el botón de arrepentimiento
          </Link>
          .
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-line bg-white p-6">
        <h2 className="font-bold text-ink">¿Necesitás gestionar un cambio?</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href={whatsappUrl(
              s["store.whatsapp"],
              "Hola, quiero consultar por un cambio o devolución. Mi número de pedido es:"
            )}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Escribir por WhatsApp
          </a>
          <a
            href={`mailto:${s["store.email"]}?subject=${encodeURIComponent(
              "Cambio o devolución"
            )}`}
            className="rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand-softer"
          >
            Escribir por mail
          </a>
        </div>
      </div>
    </div>
  );
}
