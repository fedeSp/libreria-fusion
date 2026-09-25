"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  addHeroSlide,
  deleteHeroSlide,
  moveHeroSlide,
  toggleHeroSlide,
  updateHeroSlide,
} from "@/app/admin/portada/actions";

export type SlideAdmin = {
  id: string;
  imageUrl: string;
  alt: string;
  linkUrl: string | null;
  isActive: boolean;
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function HeroSlideManager({ slides }: { slides: SlideAdmin[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lo que se está editando, sin guardar todavía. Se guarda con el botón, no en
  // cada tecla: si no, cada letra del texto alternativo sería un viaje al server.
  const [borrador, setBorrador] = useState<Record<string, { alt: string; linkUrl: string }>>(
    Object.fromEntries(slides.map((s) => [s.id, { alt: s.alt, linkUrl: s.linkUrl ?? "" }])),
  );
  const [guardado, setGuardado] = useState<string | null>(null);

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE}/api/admin/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la imagen.");
        return;
      }
      const alta = await addHeroSlide(data.url, "");
      if (!alta.ok) setError(alta.error ?? "No se pudo agregar la imagen.");
      else router.refresh();
    } catch {
      setError("Error al subir la imagen.");
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function guardar(id: string) {
    const datos = borrador[id];
    if (!datos) return;
    setError(null);
    startTransition(async () => {
      const res = await updateHeroSlide(id, datos.alt, datos.linkUrl);
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar.");
        return;
      }
      setGuardado(id);
      setTimeout(() => setGuardado(null), 2000);
      router.refresh();
    });
  }

  function accion(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-line bg-white p-5">
        <p className="text-sm font-semibold text-ink">Agregar una imagen</p>
        <p className="mt-1 text-xs text-muted">
          Medida recomendada: <strong className="text-ink">1200 × 450 píxeles</strong>. El texto de
          la promoción va adentro de la imagen. JPG, PNG, WEBP o GIF, hasta 5 MB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={subir}
          disabled={subiendo}
          className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
        {subiendo && <p className="mt-2 text-xs text-muted">Subiendo…</p>}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {slides.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
          Todavía no hay imágenes. Mientras no cargues ninguna, la portada muestra el texto de
          bienvenida de siempre.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {slides.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap gap-4">
                <div className="relative aspect-[1200/450] w-56 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
                  <Image src={s.imageUrl} alt={s.alt} fill sizes="224px" className="object-cover" />
                  {!s.isActive && (
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/60 text-xs font-bold text-white">
                      OCULTA
                    </span>
                  )}
                </div>

                <div className="min-w-56 flex-1 space-y-2">
                  <label className="block text-xs font-semibold text-ink">
                    Qué dice la imagen
                    <input
                      value={borrador[s.id]?.alt ?? ""}
                      onChange={(e) =>
                        setBorrador({
                          ...borrador,
                          [s.id]: { ...borrador[s.id], alt: e.target.value },
                        })
                      }
                      placeholder="Ej: 20% off en mochilas hasta el viernes"
                      className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm font-normal text-ink focus:border-brand"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-ink">
                    A dónde lleva <span className="font-normal text-muted">(opcional)</span>
                    <input
                      value={borrador[s.id]?.linkUrl ?? ""}
                      onChange={(e) =>
                        setBorrador({
                          ...borrador,
                          [s.id]: { ...borrador[s.id], linkUrl: e.target.value },
                        })
                      }
                      placeholder="/categoria/escolar"
                      className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-mono text-xs font-normal text-ink focus:border-brand"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => guardar(s.id)}
                  className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  Guardar
                </button>
                {guardado === s.id && <span className="text-xs text-success">Guardado</span>}

                <span className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    disabled={pending || i === 0}
                    onClick={() => accion(() => moveHeroSlide(s.id, "arriba"))}
                    className="text-brand hover:underline disabled:opacity-30"
                  >
                    ↑ Subir
                  </button>
                  <button
                    type="button"
                    disabled={pending || i === slides.length - 1}
                    onClick={() => accion(() => moveHeroSlide(s.id, "abajo"))}
                    className="text-brand hover:underline disabled:opacity-30"
                  >
                    ↓ Bajar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => accion(() => toggleHeroSlide(s.id, !s.isActive))}
                    className="text-brand hover:underline disabled:opacity-50"
                  >
                    {s.isActive ? "Ocultar" : "Mostrar"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm("¿Borrar esta imagen de la portada?")) {
                        accion(() => deleteHeroSlide(s.id));
                      }
                    }}
                    className="text-muted hover:text-danger disabled:opacity-50"
                  >
                    Borrar
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
