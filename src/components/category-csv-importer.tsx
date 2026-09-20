"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewCategoryImport,
  confirmCategoryImport,
  type CategoryCsvPlan,
  type CategoryImportResult,
} from "@/app/admin/categorias/actions";

export function CategoryCsvImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [plan, setPlan] = useState<CategoryCsvPlan | null>(null);
  const [result, setResult] = useState<CategoryImportResult | null>(null);
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
        const p = await previewCategoryImport(text);
        setPlan(p);
      });
    };
    reader.readAsText(file, "utf-8");
  }

  function confirm() {
    if (!csvText) return;
    setError(null);
    startTransition(async () => {
      const res = await confirmCategoryImport(csvText);
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

  return (
    <div className="max-w-2xl">
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

          {plan.rows.length > 0 ? (
            <>
              <p className="mt-3 text-sm text-muted">
                Se van a crear o actualizar {plan.rows.length}{" "}
                {plan.rows.length === 1 ? "categoría" : "categorías"}:
              </p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-left text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Nombre</th>
                      <th className="px-3 py-2 font-semibold">Slug</th>
                      <th className="px-3 py-2 font-semibold">Padre</th>
                      <th className="px-3 py-2 font-semibold">Activa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {plan.rows.map((r) => (
                      <tr key={r.line}>
                        <td className="px-3 py-2 text-ink">{r.name}</td>
                        <td className="px-3 py-2 text-muted">{r.slug || "se genera solo"}</td>
                        <td className="px-3 py-2 text-muted">{r.parentSlug || "—"}</td>
                        <td className="px-3 py-2 text-muted">{r.isActive ? "Sí" : "No"}</td>
                      </tr>
                    ))}
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
                  {pending ? "Importando…" : `Confirmar importación (${plan.rows.length})`}
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
            <p className="mt-3 text-sm text-muted">No hay ninguna fila válida para importar.</p>
          )}
        </div>
      )}

      {result?.ok && (
        <div className="mt-5 rounded-lg border border-success/30 bg-success/5 p-4 text-sm">
          <p className="font-semibold text-success">
            Listo: {result.created} {result.created === 1 ? "categoría creada" : "categorías creadas"}
            {result.updated ? `, ${result.updated} actualizada${result.updated === 1 ? "" : "s"}` : ""}.
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
