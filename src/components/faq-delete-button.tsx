"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFaq } from "@/app/admin/preguntas-frecuentes/actions";

export function FaqDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handle() {
    if (!window.confirm("¿Borrar esta pregunta?")) return;
    startTransition(async () => {
      await deleteFaq(id);
      router.push("/admin/preguntas-frecuentes");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handle}
      className="rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
    >
      Borrar
    </button>
  );
}
