"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/money";
import {
  previewProductImport,
  confirmProductImport,
  type ProductImportResult,
} from "@/app/admin/productos/import-actions";
import type { ProductCsvPlan } from "@/lib/product-csv";

export function ProductCsvImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [plan, setPlan] = useState<ProductCsvPlan | null>(null);
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setPlan(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsvText(text);
      startTransition(async () => {
        setPlan(await previewProductImport(text));
      });
    };
    reader.readAsText(file, "utf-8");
  }

  function confirm() {
    if (!csvText) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmProductImport(csvText);
      if (!res.ok) {
        setError(res.error ?? "No se pudo importar.");
        return;
      }
      setResult(res);
      setPlan(null);
      router.refresh();
    });
  }

  function reset() {
    setFileName(null);
    setCsvText(null);
    setPlan(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const variantes = plan?.products.reduce((n, p) => n + p.variants.length, 0) ?? 0;

  return (
    <div className="max-w-3xl">
      {!result && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            disabled={pending}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark"
          />
          {fileName && <p className="mt-1 text-xs text-muted">{fileName}</p>}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {plan && (
        <div className="mt-5">
          {plan.errors.length > 0 && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              <p className="font-semibold">
                {plan.errors.length === 1
                  ? "1 fila con problemas (no se va a importar):"
                  : `${plan.errors.length} filas con problemas (no se van a importar):`}
              </p>
              <ul className="mt-1 list-disc pl-5">
                {plan.errors.map((e, i) => (
                  <li key={i}>
                    Fila {e.line}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.products.length > 0 ? (
            <>
              <p className="mt-3 text-sm text-muted">
                Se van a crear o actualizar {plan.products.length}{" "}
                {plan.products.length === 1 ? "producto" : "productos"} con {variantes}{" "}
                {variantes === 1 ? "variante" : "variantes"}:
              </p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-left text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Producto</th>
                      <th className="px-3 py-2 font-semibold">Categoría</th>
                      <th className="px-3 py-2 font-semibold">Variantes</th>
                      <th className="px-3 py-2 font-semibold">Precio</th>
                      <th className="px-3 py-2 font-semibold">Fotos</th>
                      <th className="px-3 py-2 font-semibold">Activo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {plan.products.map((p) => {
                      const precios = p.variants.map((v) => v.priceCents);
                      const min = Math.min(...precios);
                      const max = Math.max(...precios);
                      return (
                        <tr key={`${p.line}-${p.name}`}>
                          <td className="px-3 py-2 text-ink">
                            {p.name}
                            <span className="block text-xs text-muted">
                              {p.slug || "slug generado del nombre"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted">{p.categorySlug || "—"}</td>
                          <td className="px-3 py-2 text-muted">
                            {p.variants.map((v) => v.name).join(", ")}
                          </td>
                          <td className="px-3 py-2 text-muted">
                            {min === max
                              ? formatPrice(min)
                              : `${formatPrice(min)} – ${formatPrice(max)}`}
                          </td>
                          <td className="px-3 py-2 text-muted">{p.images.length || "—"}</td>
                          <td className="px-3 py-2 text-muted">{p.isActive ? "Sí" : "No"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={pending}
                  onClick={confirm}
                  className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {pending ? "Importando…" : `Confirmar importación (${plan.products.length})`}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-brand"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No hay ningún producto válido para importar.</p>
          )}
        </div>
      )}

      {result?.ok && (
        <div className="mt-5 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
          <p className="font-semibold text-success">
            Listo: {result.createdProducts} {result.createdProducts === 1 ? "producto creado" : "productos creados"}
            {result.updatedProducts
              ? `, ${result.updatedProducts} actualizado${result.updatedProducts === 1 ? "" : "s"}`
              : ""}
            .
          </p>
          <p className="mt-1 text-muted">
            {result.createdVariants} {result.createdVariants === 1 ? "variante nueva" : "variantes nuevas"}
            {result.updatedVariants
              ? `, ${result.updatedVariants} actualizada${result.updatedVariants === 1 ? "" : "s"}`
              : ""}
            {result.addedImages ? `, ${result.addedImages} foto${result.addedImages === 1 ? "" : "s"} agregada${result.addedImages === 1 ? "" : "s"}` : ""}
            .
          </p>
          {result.warnings && result.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-muted">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-sm font-semibold text-brand hover:underline"
          >
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  );
}
