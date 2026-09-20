import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { PickupNotice } from "@/components/pickup-notice";

export const metadata: Metadata = {
  title: "Cómo comprar",
  description:
    "Paso a paso para comprar en Librería Fusión: elegís online, pagás como prefieras y retirás en el local o pedís envío a domicilio.",
};

const PASOS = [
  {
    titulo: "Elegí lo que necesitás",
    texto:
      "Buscá en el catálogo o usá el buscador. Si el producto tiene variantes, elegí el color o la medida antes de agregarlo.",
  },
  {
    titulo: "Agregalo al carrito",
    texto:
      "Podés seguir sumando productos. En el carrito ves el total antes de avanzar, sin sorpresas de último momento.",
  },
  {
    titulo: "Dejanos tus datos",
    texto:
      "Nombre, email, teléfono y cómo querés recibirlo: retiro en el local o envío a domicilio.",
  },
  {
    titulo: "Elegí cómo pagar",
    texto:
      "Mercado Pago (tarjeta, débito o dinero en cuenta, con cuotas sin interés), efectivo al retirar, o Cuenta DNI con el link de pago por WhatsApp.",
  },
  {
    titulo: "Preparamos el pedido",
    texto:
      "Apenas se confirma el pago lo empezamos a armar. Te llega un mail con el número de pedido.",
  },
  {
    titulo: "Te avisamos cuando esté listo",
    texto:
      "Si elegiste retiro, te escribimos por WhatsApp o mail para que pases a buscarlo. Si elegiste envío, coordinamos la entrega por WhatsApp apenas se confirma el pago.",
  },
];

export default async function ComoComprarPage() {
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Cómo comprar</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold text-ink">Cómo comprar</h1>
      <p className="mt-2 text-muted">
        Son seis pasos y no tiene ninguna vuelta. Si algo no te cierra,
        escribinos por WhatsApp y lo resolvemos.
      </p>

      <div className="mt-6">
        <PickupNotice />
      </div>

      <ol className="mt-8 space-y-5">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold text-ink">{paso.titulo}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {paso.texto}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-10 rounded-xl border border-line bg-white p-6 text-center">
        <h2 className="font-bold text-ink">¿Tenés dudas?</h2>
        <p className="mt-2 text-sm text-muted">
          Envíos, medios de pago, plazos de entrega y más.
        </p>
        <Link
          href="/preguntas-frecuentes"
          className="mt-4 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Ver preguntas frecuentes
        </Link>
      </section>

      <p className="mt-8 text-sm text-muted">
        Horarios de atención: {s["store.hours"]}.
      </p>
    </div>
  );
}
