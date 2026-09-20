"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createProduct, type NewProductInput } from "@/app/admin/productos/actions";

type Category = { id: string; name: string };

const inputCls =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ProductCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    summary: "",
    description: "",
    categoryId: "",
    isActive: true,
    isFeatured: false,
  });
  const [variants, setVariants] = useState([{ name: "Único", price: "", stock: "0" }]);
  const [images, setImages] = useState<{ url: string; alt: string }[]>([]);

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
      setImages((prev) => [...prev, { url: data.url, alt: form.name }]);
    } catch {
      setError("Error al subir la imagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: NewProductInput = { ...form, variants, images };
    startTransition(async () => {
      const res = await createProduct(input);
      if (!res.ok) setError(res.error ?? "No se pudo crear");
      else router.push(`/admin/productos/${res.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div>
        <label className="text-sm font-semibold text-ink">Nombre</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputCls}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">
          Link (slug) <span className="font-normal text-muted">— opcional, se genera solo</span>
        </label>
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="se-genera-del-nombre"
          className={inputCls}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">Categoría</label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className={inputCls}
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">Bajada corta</label>
        <input
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          className={inputCls}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">Descripción</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Variantes */}
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Variantes</legend>
        <p className="text-xs text-muted">
          Si el producto no tiene versiones, dejá una sola llamada “Único”.
        </p>
        <div className="mt-2 space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-3">
              <input
                value={v.name}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = { ...v, name: e.target.value };
                  setVariants(next);
                }}
                placeholder="Nombre (ej: Negro)"
                className="w-32 rounded border border-line px-2 py-1 text-sm"
              />
              <input
                value={v.price}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = { ...v, price: e.target.value };
                  setVariants(next);
                }}
                placeholder="Precio $"
                inputMode="decimal"
                className="w-28 rounded border border-line px-2 py-1 text-sm"
              />
              <input
                value={v.stock}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = { ...v, stock: e.target.value };
                  setVariants(next);
                }}
                type="number"
                min={0}
                placeholder="Stock"
                className="w-20 rounded border border-line px-2 py-1 text-sm"
              />
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                  className="text-xs text-muted hover:text-danger"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setVariants([...variants, { name: "", price: "", stock: "0" }])}
          className="mt-2 text-sm font-semibold text-brand hover:underline"
        >
          + Agregar variante
        </button>
      </fieldset>

      {/* Fotos */}
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Fotos</legend>
        {images.length > 0 && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {images.map((im, i) => (
              <div key={im.url} className="relative">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-white">
                  <Image src={im.url} alt={im.alt} fill sizes="100px" className="object-contain p-1" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Portada
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="mt-1 text-[11px] text-muted hover:text-danger"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFile}
          disabled={uploading}
          className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
        <p className="mt-1 text-xs text-muted">
          {uploading ? "Subiendo…" : "JPG, PNG, WEBP o GIF, hasta 5 MB. La primera es la portada."}
        </p>
      </fieldset>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Activo (visible en la tienda)
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
          />
          Destacado
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear producto"}
      </button>
    </form>
  );
}
