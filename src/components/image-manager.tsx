"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  addProductImage,
  deleteProductImage,
  makeImageCover,
  setProductImageVariant,
} from "@/app/admin/productos/actions";

type Img = { id: string; url: string; alt: string; variantId: string | null };
type Variant = { id: string; name: string };

// El basePath está disponible en el cliente (variable NEXT_PUBLIC).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ImageManager({
  productId,
  productName,
  images,
  variants,
}: {
  productId: string;
  productName: string;
  images: Img[];
  variants: Variant[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BASE}/api/admin/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la imagen.");
        return;
      }
      const add = await addProductImage(productId, data.url, productName);
      if (!add.ok) setError(add.error ?? "No se pudo agregar la imagen.");
      else router.refresh();
    } catch {
      setError("Error al subir la imagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    if (!window.confirm("¿Borrar esta foto?")) return;
    startTransition(async () => {
      await deleteProductImage(id);
      router.refresh();
    });
  }

  function cover(id: string) {
    startTransition(async () => {
      await makeImageCover(id);
      router.refresh();
    });
  }

  function assignVariant(imageId: string, variantId: string) {
    startTransition(async () => {
      await setProductImageVariant(imageId, variantId || null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((img, i) => (
          <div key={img.id} className="group relative">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-white">
              <Image src={img.url} alt={img.alt} fill sizes="140px" className="object-contain p-1" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Portada
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-col items-start gap-0.5 text-[11px]">
              {i !== 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => cover(img.id)}
                  className="text-brand hover:underline disabled:opacity-50"
                >
                  Hacer portada
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(img.id)}
                className="text-muted hover:text-danger disabled:opacity-50"
              >
                Borrar
              </button>
            </div>
            {variants.length > 1 && (
              <select
                value={img.variantId ?? ""}
                disabled={pending}
                onChange={(e) => assignVariant(img.id, e.target.value)}
                className="mt-1 w-full rounded border border-line px-1 py-1 text-[11px] text-ink disabled:opacity-50"
              >
                <option value="">Todas las variantes</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFile}
          disabled={uploading}
          className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
        <p className="mt-1 text-xs text-muted">
          {uploading
            ? "Subiendo…"
            : variants.length > 1
              ? "JPG, PNG, WEBP o GIF, hasta 5 MB. La primera es la portada. Asigná cada foto a un color si corresponde."
              : "JPG, PNG, WEBP o GIF, hasta 5 MB. La primera es la portada."}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    </div>
  );
}
