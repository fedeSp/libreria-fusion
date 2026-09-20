"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/money";
import { PickupNoticeClient } from "@/components/pickup-notice-client";
import type { ResolvedLine } from "@/lib/cart";
import { resolveCartAction } from "@/app/(store)/carrito/actions";
import { createCheckout } from "@/app/(store)/checkout/actions";

type PaymentMethodOption = {
  code: string;
  label: string;
  description: string | null;
  isOnline: boolean;
};

export function CheckoutForm({ paymentMethods }: { paymentMethods: PaymentMethodOption[] }) {
  const { lines, hydrated, clear } = useCart();
  const router = useRouter();
  const [resolved, setResolved] = useState<ResolvedLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    note: "",
    paymentMethodCode: paymentMethods[0]?.code ?? "",
    deliveryMethod: "RETIRO_LOCAL" as "RETIRO_LOCAL" | "ENVIO_DOMICILIO",
    shippingAddress: "",
    shippingCity: "",
    shippingPostalCode: "",
  });

  const selectedMethod = paymentMethods.find((m) => m.code === form.paymentMethodCode);
  // Efectivo se paga en persona: no tiene sentido combinarlo con envío, así
  // que directamente se bloquea la opción en vez de dejar que el cliente elija
  // una combinación que el servidor va a rechazar igual.
  const shippingBlocked = form.paymentMethodCode === "efectivo";

  useEffect(() => {
    if (shippingBlocked && form.deliveryMethod === "ENVIO_DOMICILIO") {
      setForm((f) => ({ ...f, deliveryMethod: "RETIRO_LOCAL" }));
    }
  }, [shippingBlocked, form.deliveryMethod]);

  useEffect(() => {
    if (!hydrated) return;
    if (lines.length === 0) {
      setResolved([]);
      setLoading(false);
      return;
    }
    (async () => {
      const res = await resolveCartAction(lines);
      setResolved(res.lines);
      setSubtotal(res.subtotalCents);
      setLoading(false);
    })();
  }, [lines, hydrated]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCheckout(form, lines);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Pedido creado: vaciamos el carrito y seguimos al pago o a la página
      // del pedido si es un medio manual o MP todavía no está configurado.
      clear();
      if (result.initPoint) {
        window.location.href = result.initPoint;
      } else {
        router.push(`/pedido/${result.orderNumber}`);
      }
    });
  }

  if (!hydrated || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-muted">Cargando…</p>
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-ink">No hay nada para pagar</h1>
        <p className="mt-2 text-muted">Tu carrito está vacío.</p>
        <Link
          href="/productos"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/carrito" className="hover:text-brand">
          Carrito
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Checkout</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold text-ink">Finalizar compra</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Datos de contacto */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {form.deliveryMethod === "RETIRO_LOCAL" && <PickupNoticeClient />}

          <div>
            <label htmlFor="name" className="text-sm font-semibold text-ink">
              Nombre y apellido
            </label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="text-sm font-semibold text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-semibold text-ink">
                Teléfono / WhatsApp
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
              />
            </div>
          </div>

          {paymentMethods.length > 0 && (
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Medio de pago</legend>
              <div className="mt-2 flex flex-col gap-2">
                {paymentMethods.map((m) => (
                  <label
                    key={m.code}
                    className="flex flex-col gap-0.5 rounded-lg border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-brand has-[:checked]:bg-brand-softer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethodCode"
                        checked={form.paymentMethodCode === m.code}
                        onChange={() => setForm({ ...form, paymentMethodCode: m.code })}
                      />
                      {m.label}
                    </span>
                    {m.description && (
                      <span className="pl-6 text-xs text-muted">{m.description}</span>
                    )}
                  </label>
                ))}
              </div>
              {selectedMethod?.code === "cuenta-dni" && (
                <p className="mt-2 text-xs text-muted">
                  Te vamos a escribir al WhatsApp que dejaste con el link de pago de Cuenta DNI.
                </p>
              )}
            </fieldset>
          )}

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Entrega</legend>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-brand has-[:checked]:bg-brand-softer">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={form.deliveryMethod === "RETIRO_LOCAL"}
                  onChange={() => setForm({ ...form, deliveryMethod: "RETIRO_LOCAL" })}
                />
                Retiro en el local
              </label>
              <label
                className={`flex flex-1 items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink has-[:checked]:border-brand has-[:checked]:bg-brand-softer ${
                  shippingBlocked ? "cursor-not-allowed opacity-50" : ""
                }`}
                title={shippingBlocked ? "Pagando en efectivo el pedido se retira en el local." : undefined}
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  disabled={shippingBlocked}
                  checked={form.deliveryMethod === "ENVIO_DOMICILIO"}
                  onChange={() => setForm({ ...form, deliveryMethod: "ENVIO_DOMICILIO" })}
                />
                Envío a domicilio
              </label>
            </div>
            {shippingBlocked && (
              <p className="mt-1 text-xs text-muted">
                Pagando en efectivo el pedido se retira en el local.
              </p>
            )}
          </fieldset>

          {form.deliveryMethod === "ENVIO_DOMICILIO" && (
            <fieldset className="space-y-4 rounded-lg border border-line p-4">
              <legend className="px-1 text-sm font-semibold text-ink">Dirección de envío</legend>
              <p className="-mt-2 text-xs text-muted">
                Coordinamos el costo y el medio de envío por WhatsApp antes de despacharlo. El
                plazo de entrega arranca cuando se confirma el pago, no cuando hacés el pedido.
              </p>
              <div>
                <label htmlFor="shippingAddress" className="text-sm font-semibold text-ink">
                  Calle y número
                </label>
                <input
                  id="shippingAddress"
                  required
                  value={form.shippingAddress}
                  onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
                  placeholder="Ej: Av. Rivadavia 1234, piso 2 depto B"
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="shippingCity" className="text-sm font-semibold text-ink">
                    Localidad
                  </label>
                  <input
                    id="shippingCity"
                    required
                    value={form.shippingCity}
                    onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
                  />
                </div>
                <div>
                  <label htmlFor="shippingPostalCode" className="text-sm font-semibold text-ink">
                    Código postal
                  </label>
                  <input
                    id="shippingPostalCode"
                    required
                    value={form.shippingPostalCode}
                    onChange={(e) => setForm({ ...form, shippingPostalCode: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
                  />
                </div>
              </div>
            </fieldset>
          )}

          <div>
            <label htmlFor="note" className="text-sm font-semibold text-ink">
              Aclaración <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id="note"
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ej: paso a retirar el jueves a la tarde"
              className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {pending
              ? "Procesando…"
              : selectedMethod?.isOnline
                ? "Ir a pagar con Mercado Pago"
                : "Confirmar pedido"}
          </button>
          <p className="text-center text-xs text-muted">
            {selectedMethod?.isOnline
              ? "Te vamos a llevar al sitio seguro de Mercado Pago para completar el pago."
              : "Coordinamos el pago por fuera del sitio, como dice arriba."}
          </p>
        </form>

        {/* Resumen */}
        <aside className="h-fit rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-bold text-ink">Tu pedido</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {resolved.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-2">
                <span className="text-muted">
                  {l.quantity}× {l.productName}
                  {l.variantName !== "Único" && ` (${l.variantName})`}
                </span>
                <span className="shrink-0 text-ink">
                  {formatPrice(l.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-semibold text-ink">Total</span>
            <span className="text-lg font-extrabold text-brand">
              {formatPrice(subtotal)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
