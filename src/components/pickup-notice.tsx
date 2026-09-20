import { getSettings } from "@/lib/settings";

type Props = {
  /** "banner" para la franja superior, "inline" dentro de una ficha o del carrito. */
  variant?: "banner" | "inline";
};

/**
 * El aviso de "solo retiro en local". Aparece en la franja superior, en cada
 * ficha de producto, en el carrito y en el checkout: es la regla de negocio
 * que más sorpresas evita, así que se repite en todo el recorrido de compra.
 */
export async function PickupNotice({ variant = "inline" }: Props) {
  const settings = await getSettings();
  const notice = settings["pickup.notice"];
  const detail = settings["pickup.detail"];
  const address = settings["store.address"];

  if (variant === "banner") {
    return (
      <div className="bg-brand text-white">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-sm font-medium">
          {notice}{" "}
          <span className="font-normal opacity-90">Retirás en {address}.</span>
        </p>
      </div>
    );
  }

  return (
    <aside className="rounded-lg border border-brand/25 bg-brand-softer p-4">
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
