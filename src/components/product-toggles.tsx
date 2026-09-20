"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProductActive, toggleProductFeatured } from "@/app/admin/productos/actions";

// Interruptores rápidos de la lista de productos: activar/desactivar y destacar.
export function ProductToggles({
  id,
  isActive,
  isFeatured,
}: {
  id: string;
  isActive: boolean;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function flip(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => flip(() => toggleProductActive(id, !isActive))}
        className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
          isActive
            ? "bg-success/10 text-success"
            : "border border-line text-muted"
        }`}
      >
        {isActive ? "Activo" : "Inactivo"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => flip(() => toggleProductFeatured(id, !isFeatured))}
        className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
          isFeatured
            ? "bg-brand-soft text-brand"
            : "border border-line text-muted"
        }`}
      >
        {isFeatured ? "★ Destacado" : "☆ Destacar"}
      </button>
    </div>
  );
}
