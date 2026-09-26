"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { STATUS_LABEL } from "./order-status";
import { updateOrderStatus } from "@/app/admin/pedidos/actions";

// Botones para avanzar (o cancelar) un pedido. Cada botón corresponde a una
// transición permitida, que decide el servidor.
export function OrderActions({
  orderId,
  next,
  reembolsable,
}: {
  orderId: string;
  next: OrderStatus[];
  // Cobrado por Mercado Pago: cancelar dispara un reembolso de verdad, así que
  // se avisa antes. Un pedido de pago en el local no entra acá: todavía no se
  // cobró nada.
  reembolsable: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (next.length === 0) {
    return <p className="text-sm text-muted">No hay acciones para este pedido.</p>;
  }

  function run(status: OrderStatus) {
    if (status === "CANCELADO" && reembolsable) {
      const ok = window.confirm(
        "Este pedido ya está pagado. Cancelarlo va a REEMBOLSAR el pago al cliente por Mercado Pago y reponer el stock. ¿Confirmás?",
      );
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateOrderStatus(orderId, status);
      if (!res.ok) setError(res.error ?? "No se pudo actualizar");
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => {
          const danger = s === "CANCELADO";
          const label = danger
            ? reembolsable
              ? "Cancelar y reembolsar"
              : "Cancelar pedido"
            : `Marcar: ${STATUS_LABEL[s]}`;
          return (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => run(s)}
              className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                danger
                  ? "border border-danger/40 text-danger hover:bg-danger/5"
                  : "bg-brand text-white hover:bg-brand-dark"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
