"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/app/admin/productos/actions";

// Baja de producto. Confirma antes, y avisa si en vez de borrar se desactivó
// (cuando el producto ya tiene ventas, no se puede borrar sin perder historial).
export function ProductDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    if (!window.confirm("¿Dar de baja este producto? Si nunca se vendió, se elimina.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteProduct(id);
      if (!res.ok) {
        setError(res.error ?? "No se pudo eliminar");
        return;
      }
      if (res.deactivated) {
        window.alert("El producto tenía ventas, así que se desactivó en vez de borrarse.");
        router.refresh();
      } else {
        router.push("/admin/productos");
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
