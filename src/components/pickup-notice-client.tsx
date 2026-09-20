"use client";

// Versión cliente del aviso de retiro, para usar dentro de páginas cliente
// (carrito, checkout) donde no se puede renderizar el server component async.
// El texto es el mismo copy por defecto que StoreSetting; si algún día se hace
// editable de verdad, se le pasa por props desde un server component padre.
export function PickupNoticeClient({
  notice = "Retirá en el local o pedí envío a domicilio.",
  detail = "Cuando tu pedido esté listo te avisamos por WhatsApp o mail. Lo guardamos 7 días desde el aviso.",
  address = "Santos Vega 7196, Villa Bosch — Tres de Febrero",
}: {
  notice?: string;
  detail?: string;
  address?: string;
}) {
  return (
    <aside className="rounded-xl border border-brand/25 bg-brand-softer p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-brand">
        <span aria-hidden="true">📍</span>
        <span>{notice}</span>
      </p>
      <p className="mt-1 pl-6 text-sm text-muted">{detail}</p>
      <p className="mt-1 pl-6 text-sm text-muted">
        Dirección: <span className="text-ink">{address}</span>
      </p>
    </aside>
  );
}
