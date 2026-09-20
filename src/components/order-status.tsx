import type { OrderStatus } from "@prisma/client";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "Esperando pago",
  PAGADO: "Pagado",
  EN_PREPARACION: "En preparación",
  LISTO_PARA_RETIRAR: "Listo para retirar",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
};

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "bg-brand-soft text-brand",
  PAGADO: "bg-success/10 text-success",
  EN_PREPARACION: "bg-success/10 text-success",
  LISTO_PARA_RETIRAR: "bg-success/15 text-success",
  ENTREGADO: "bg-line text-muted",
  CANCELADO: "bg-danger/10 text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
