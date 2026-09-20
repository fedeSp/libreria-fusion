import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, whatsappUrl } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escribinos por WhatsApp o mail, o pasá por el local en Villa Bosch, Tres de Febrero.",
};

export default async function ContactoPage() {
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Contacto</span>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold text-ink">Contacto</h1>
      <p className="mt-2 text-muted">
        Lo más rápido es WhatsApp: contestamos en horario de local.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={whatsappUrl(
            s["store.whatsapp"],
            "¡Hola! Te escribo desde la web de Librería Fusión."
          )}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-line bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
        >
          <h2 className="font-semibold text-brand">WhatsApp</h2>
          <p className="mt-1 text-sm text-ink">{s["store.phone"]}</p>
          <p className="mt-1 text-xs text-muted">Tocá para abrir el chat</p>
        </a>

        <a
          href={`mailto:${s["store.email"]}`}
          className="rounded-xl border border-line bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
        >
          <h2 className="font-semibold text-brand">Email</h2>
          <p className="mt-1 break-all text-sm text-ink">{s["store.email"]}</p>
          <p className="mt-1 text-xs text-muted">Respondemos dentro de las 48 h</p>
        </a>
      </div>

      <section className="mt-8 rounded-xl border border-line bg-white p-6">
        <h2 className="font-bold text-ink">El local</h2>
        <p className="mt-2 text-sm text-ink">{s["store.address"]}</p>
        <p className="mt-1 text-sm text-muted">{s["store.hours"]}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            s["store.address"]
          )}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Ver cómo llegar →
        </a>
      </section>

      <section className="mt-8">
        <h2 className="font-bold text-ink">Seguinos</h2>
        <ul className="mt-2 flex flex-wrap gap-4 text-sm">
          <li>
            <a
              href={s["instagram.url"]}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              Instagram
            </a>
          </li>
          <li>
            <a
              href={s["facebook.url"]}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              Facebook
            </a>
          </li>
          <li>
            <a
              href={s["tiktok.url"]}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:underline"
            >
              TikTok
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
