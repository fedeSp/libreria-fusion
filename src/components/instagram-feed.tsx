import { getSettings } from "@/lib/settings";
import { instagramHandle, parseInstagramPosts } from "@/lib/instagram";
import { InstagramEmbedScript } from "./instagram-embed-script";

/**
 * Bloque "Seguinos en Instagram" de la home. Los posteos los elige el local
 * pegando los links en /admin/ajustes.
 *
 * Si no hay ninguno cargado, la sección no se renderiza: mejor que no exista a
 * que quede un hueco con un título y nada abajo.
 */
export async function InstagramFeed() {
  const settings = await getSettings();
  const posts = parseInstagramPosts(settings["instagram.posts"]);
  if (posts.length === 0) return null;

  const profileUrl = settings["instagram.url"];
  const handle = instagramHandle(profileUrl);

  return (
    <section className="border-t border-line bg-brand-softer">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Redes
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">Seguinos en Instagram</h2>
          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm font-medium text-brand hover:underline"
            >
              {handle ?? "Ver el perfil"}
            </a>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-6">
          {posts.map((url) => (
            // El widget reemplaza el <blockquote> por un iframe con su propio
            // estilo, así que el recorte y el degradado van en este contenedor
            // de afuera, que Instagram no toca.
            <div
              key={url}
              className="relative w-full max-w-[326px] overflow-hidden rounded-xl bg-white"
            >
              <div className="max-h-[470px] overflow-hidden">
                {/* Sin data-instgrm-captioned: el posteo entra sin el texto
                    del pie, que es lo que lo hacía larguísimo. Quien quiera
                    leerlo entra al posteo. El <a> de adentro es el respaldo si
                    el script no carga (bloqueador, sin JS): degrada a un link
                    en vez de dejar un recuadro vacío. */}
                <blockquote
                  className="instagram-media p-4"
                  data-instgrm-permalink={url}
                  data-instgrm-version="14"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    Ver esta publicación en Instagram
                  </a>
                </blockquote>
              </div>
              {/* Que el corte se lea como parte del diseño y no como un error. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-white"
              />
            </div>
          ))}
        </div>
      </div>

      <InstagramEmbedScript />
    </section>
  );
}
