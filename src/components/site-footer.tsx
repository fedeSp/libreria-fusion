import Link from "next/link";
import { getSettings, whatsappUrl } from "@/lib/settings";

export async function SiteFooter() {
  const s = await getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <h2 className="text-sm font-bold text-ink">Dónde estamos</h2>
          <p className="mt-2 text-sm text-muted">{s["store.address"]}</p>
          <p className="mt-2 text-sm text-muted">{s["store.hours"]}</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-ink">Contacto</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <a
                href={whatsappUrl(s["store.whatsapp"])}
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp {s["store.phone"]}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${s["store.email"]}`}
                className="text-brand hover:underline"
              >
                {s["store.email"]}
              </a>
            </li>
          </ul>

          <h2 className="mt-4 text-sm font-bold text-ink">Seguinos</h2>
          <ul className="mt-2 flex gap-4 text-sm">
            <li>
              <a
                href={s["instagram.url"]}
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href={s["facebook.url"]}
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href={s["tiktok.url"]}
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                TikTok
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-ink">Información</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link href="/como-comprar" className="text-brand hover:underline">
                Cómo comprar
              </Link>
            </li>
            <li>
              <Link href="/preguntas-frecuentes" className="text-brand hover:underline">
                Preguntas frecuentes
              </Link>
            </li>
            <li>
              <Link href="/devoluciones" className="text-brand hover:underline">
                Cambios y devoluciones
              </Link>
            </li>
            <li>
              <Link href="/quienes-somos" className="text-brand hover:underline">
                Quiénes somos
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Obligatorios por normativa argentina de comercio electrónico. */}
      <div className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted">
          <p>
            © {year} Librería Fusión · CUIT {s["store.cuit"]}. Todos los derechos
            reservados.
          </p>
          <p className="mt-1">
            Defensa de las y los consumidores. Para reclamos{" "}
            <a
              href="https://autogestion.produccion.gob.ar/consumidores"
              className="text-brand hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              ingresá acá
            </a>{" "}
            ·{" "}
            <Link href="/arrepentimiento" className="text-brand hover:underline">
              Botón de arrepentimiento
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
