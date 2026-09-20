"use client";

import { useActionState } from "react";
import { saveProduct, type ProductFormState } from "@/app/admin/productos/actions";

type Variant = { id: string; name: string; priceCents: number; stock: number };
type Category = { id: string; name: string };

export function ProductEditForm({
  productId,
  initial,
  categories,
  variants,
}: {
  productId: string;
  initial: { name: string; summary: string; description: string; categoryId: string };
  categories: Category[];
  variants: Variant[];
}) {
  const action = saveProduct.bind(null, productId);
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    action,
    { ok: false },
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="text-sm font-semibold text-ink">Nombre</label>
        <input
          id="name"
          name="name"
          defaultValue={initial.name}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
        />
      </div>

      <div>
        <label htmlFor="categoryId" className="text-sm font-semibold text-ink">Categoría</label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={initial.categoryId}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="summary" className="text-sm font-semibold text-ink">
          Bajada corta <span className="font-normal text-muted">(en las tarjetas)</span>
        </label>
        <input
          id="summary"
          name="summary"
          defaultValue={initial.summary}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
        />
      </div>

      <div>
        <label htmlFor="description" className="text-sm font-semibold text-ink">Descripción</label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={initial.description}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
        />
        <p className="mt-1 text-xs text-muted">Dejá una línea en blanco para separar párrafos.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-ink">Variantes: precio y stock</legend>
        <div className="mt-2 space-y-2">
          {variants.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
              <span className="min-w-24 text-sm font-medium text-ink">{v.name}</span>
              <label className="text-xs text-muted">
                Precio $
                <input
                  name={`price_${v.id}`}
                  defaultValue={(v.priceCents / 100).toFixed(2).replace(".", ",")}
                  inputMode="decimal"
                  className="ml-1 w-28 rounded border border-line px-2 py-1 text-sm text-ink"
                />
              </label>
              <label className="text-xs text-muted">
                Stock
                <input
                  name={`stock_${v.id}`}
                  type="number"
                  min={0}
                  defaultValue={v.stock}
                  className="ml-1 w-20 rounded border border-line px-2 py-1 text-sm text-ink"
                />
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          Cambios guardados.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
