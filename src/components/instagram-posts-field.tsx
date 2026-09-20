"use client";

import { useEffect, useRef, useState } from "react";
import { INSTAGRAM_POST_LIMIT, parseInstagramPosts } from "@/lib/instagram";
import {
  InstagramEmbedScript,
  processInstagramEmbeds,
} from "./instagram-embed-script";

/**
 * Editor de los posteos de Instagram de la home: se pega un link, se agrega, y
 * se ve el posteo ahí mismo antes de guardar. Mismo flujo que el panel de ART
 * Muebles.
 *
 * El valor viaja al server en un input oculto (un link por línea), así la
 * acción que guarda los ajustes no necesita saber nada de todo esto.
 */
export function InstagramPostsField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [posts, setPosts] = useState<string[]>(() =>
    parseInstagramPosts(defaultValue),
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);

    // Se reusa el mismo parser que la tienda: normaliza el link y descarta lo
    // que no sea un posteo, así el admin y la home nunca discrepan.
    const [url] = parseInstagramPosts(draft);
    if (!url) {
      setError(
        "Ese link no parece ser de un posteo de Instagram: tiene que tener /p/ o /reel/.",
      );
      return;
    }
    if (posts.includes(url)) {
      setError("Ese posteo ya está agregado.");
      return;
    }
    if (posts.length >= INSTAGRAM_POST_LIMIT) {
      setError(
        `Ya hay ${INSTAGRAM_POST_LIMIT} posteos, que es el máximo. Quitá uno para agregar otro.`,
      );
      return;
    }

    setPosts([...posts, url]);
    setDraft("");
  }

  return (
    <div>
      <div className="mt-1 flex gap-2">
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          // Enter dentro de un form manda el form. Acá tiene que agregar el
          // posteo, que es lo que uno espera al terminar de pegar el link.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Pegá acá el link del posteo"
          className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-full border border-brand px-5 py-2 text-sm font-semibold text-brand hover:bg-brand-softer"
        >
          Agregar
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-danger">{error}</p>}

      {posts.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
          Todavía no agregaste ningún posteo.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-4">
          {posts.map((url) => (
            <div
              key={url}
              className="relative w-[340px] max-w-full overflow-hidden rounded-lg border border-line bg-white"
            >
              <button
                type="button"
                onClick={() => setPosts(posts.filter((p) => p !== url))}
                aria-label="Quitar este posteo"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-xs text-white hover:bg-danger"
              >
                ✕
              </button>
              <EmbedPreview url={url} />
            </div>
          ))}
        </div>
      )}

      <input type="hidden" name={name} value={posts.join("\n")} />
      <InstagramEmbedScript />
    </div>
  );
}

/**
 * Un posteo embebido. El <blockquote> se inyecta a mano en vez de dejar que lo
 * pinte React: el widget de Instagram REEMPLAZA ese nodo por un iframe, y si el
 * nodo fuera de React, al quitar el posteo React intentaría borrar un elemento
 * que ya no está en el DOM y reventaría. Así React solo es dueño del contenedor.
 */
function EmbedPreview({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.innerHTML = "";
    const quote = document.createElement("blockquote");
    quote.className = "instagram-media";
    quote.setAttribute("data-instgrm-permalink", url);
    quote.setAttribute("data-instgrm-version", "14");
    node.appendChild(quote);

    processInstagramEmbeds();
  }, [url]);

  // Se recorta a una altura fija: son miniaturas para reconocer el posteo, no
  // para leer los comentarios.
  return <div ref={ref} className="max-h-[330px] overflow-hidden" />;
}
