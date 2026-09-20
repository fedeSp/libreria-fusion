"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFaqActive } from "@/app/admin/preguntas-frecuentes/actions";

export function FaqToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function flip() {
    startTransition(async () => {
      await toggleFaqActive(id, !isActive);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={flip}
      className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${
        isActive ? "bg-success/10 text-success" : "border border-line text-muted"
      }`}
    >
      {isActive ? "Activa" : "Inactiva"}
    </button>
  );
}
