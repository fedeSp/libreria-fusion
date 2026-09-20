"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFaq, updateFaq, type FaqInput } from "@/app/admin/preguntas-frecuentes/actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand";

export function FaqForm({ faqId, initial }: { faqId?: string; initial?: Partial<FaqInput> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FaqInput>({
    question: initial?.question ?? "",
    answer: initial?.answer ?? "",
    position: initial?.position ?? 0,
    isActive: initial?.isActive ?? true,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = faqId ? await updateFaq(faqId, form) : await createFaq(form);
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar");
        return;
      }
      router.push("/admin/preguntas-frecuentes");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      <div>
        <label className="text-sm font-semibold text-ink">Pregunta</label>
        <input
          required
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          className={inputCls}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">Respuesta</label>
        <textarea
          required
          rows={4}
          value={form.answer}
          onChange={(e) => setForm({ ...form, answer: e.target.value })}
          className={inputCls}
        />
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
        disabled={pending}
        className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Guardando…" : faqId ? "Guardar cambios" : "Crear pregunta"}
      </button>
    </form>
  );
}
