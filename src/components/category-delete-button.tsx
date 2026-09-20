"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategory } from "@/app/admin/categorias/actions";

// Baja de categoría. Si tiene productos o subcategorías, se desactiva en vez
// de borrarse: borrarla los dejaría sin categoría de un momento a otro.
export function CategoryDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    if (!window.confirm("¿Dar de baja esta categoría? Si nunca se usó, se elimina.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCategory(id);
      if (!res.ok) {
        setError(res.error ?? "No se pudo eliminar");
        return;
      }
      if (res.deactivated) {
        window.alert(
          "Esta categoría tiene productos o subcategorías, así que se desactivó en vez de borrarse.",
        );
        router.refresh();
      } else {
        router.push("/admin/categorias");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={handle}
        className="rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
      >
        Dar de baja
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
