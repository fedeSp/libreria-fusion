"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  createCategory,
  updateCategory,
  type CategoryInput,
} from "@/app/admin/categorias/actions";

type ParentOption = { id: string; name: string };

const inputCls =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function CategoryForm({
  categoryId,
  initial,
  parentOptions,
}: {
  categoryId?: string;
  initial?: Partial<CategoryInput>;
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CategoryInput>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? "",
    parentId: initial?.parentId ?? "",
    position: initial?.position ?? 0,
    isActive: initial?.isActive ?? true,
  });

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
      if (!res.ok) setError(data.error ?? "No se pudo subir la imagen.");
      else setForm((f) => ({ ...f, imageUrl: data.url }));
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
    startTransition(async () => {
      const res = categoryId
        ? await updateCategory(categoryId, form)
        : await createCategory(form);
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar");
        return;
      }
      router.push("/admin/categorias");
      router.refresh();
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
        <label className="text-sm font-semibold text-ink">
          Categoría padre <span className="font-normal text-muted">— opcional</span>
        </label>
        <select
          value={form.parentId}
          onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          className={inputCls}
        >
          <option value="">Ninguna (categoría de primer nivel)</option>
          {parentOptions
            .filter((p) => p.id !== categoryId)
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">Descripción</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={inputCls}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">Imagen</label>
        {form.imageUrl && (
          <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-lg border border-line bg-white">
            <Image src={form.imageUrl} alt="" fill sizes="96px" className="object-contain p-1" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFile}
          disabled={uploading}
          className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
        />
        <p className="mt-1 text-xs text-muted">
          {uploading ? "Subiendo…" : "JPG, PNG, WEBP o GIF, hasta 5 MB."}
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">
          Orden <span className="font-normal text-muted">— menor aparece primero</span>
        </label>
        <input
          type="number"
          value={form.position}
          onChange={(e) => setForm({ ...form, position: Number(e.target.value) || 0 })}
          className="mt-1 w-24 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        Activa (visible en la tienda)
      </label>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Guardando…" : categoryId ? "Guardar cambios" : "Crear categoría"}
      </button>
    </form>
  );
}
