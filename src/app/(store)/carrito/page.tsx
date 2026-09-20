"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/money";
import { PickupNoticeClient } from "@/components/pickup-notice-client";
import type { ResolvedLine } from "@/lib/cart";
import { resolveCartAction } from "./actions";

export default function CarritoPage() {
  const { lines, setQuantity, remove, hydrated } = useCart();
  const [resolved, setResolved] = useState<ResolvedLine[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  // Cada vez que cambia el carrito, revalidamos contra la base (precio/stock).
  useEffect(() => {
    if (!hydrated) return;
    if (lines.length === 0) {
      setResolved([]);
      setSubtotal(0);
      setLoading(false);
      return;
    }
    startTransition(async () => {
      const res = await resolveCartAction(lines);
      setResolved(res.lines);
      setSubtotal(res.subtotalCents);
      setLoading(false);
    });
  }, [lines, hydrated]);

  if (!hydrated || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-muted">Cargando tu carrito…</p>
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-ink">Tu carrito está vacío</h1>
        <p className="mt-2 text-muted">
          Todavía no agregaste nada. Mirá el catálogo y sumá lo que necesites.
        </p>
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
      <h1 className="text-2xl font-extrabold text-ink">Mi carrito</h1>

      <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-white">
        {resolved.map((l) => (
          <li key={l.variantId} className="flex gap-4 p-4">
            <Link
              href={`/productos/${l.productSlug}`}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-brand-softer"
            >
              {l.imageUrl && (
                <Image
                  src={l.imageUrl}
                  alt={l.imageAlt}
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/productos/${l.productSlug}`}
                className="text-sm font-semibold text-ink hover:text-brand"
              >
                {l.productName}
              </Link>
              {l.variantName !== "Único" && (
                <p className="text-xs text-muted">Color: {l.variantName}</p>
              )}
              <p className="mt-1 text-sm text-brand font-semibold">
                {formatPrice(l.unitPriceCents)}
              </p>

              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-full border border-line">
                  <button
                    type="button"
                    onClick={() => setQuantity(l.variantId, l.quantity - 1)}
                    className="px-3 py-1 text-ink"
                    aria-label="Restar uno"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold">
                    {l.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(l.variantId, l.quantity + 1)}
                    className="px-3 py-1 text-ink disabled:text-muted"
                    disabled={l.quantity >= l.stock}
                    aria-label="Sumar uno"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(l.variantId)}
                  className="text-xs text-muted hover:text-danger"
                >
                  Quitar
                </button>
              </div>
              {l.quantity >= l.stock && (
                <p className="mt-1 text-xs text-muted">
                  Es todo el stock disponible de este producto.
                </p>
              )}
            </div>

            <div className="text-right text-sm font-semibold text-ink">
              {formatPrice(l.lineTotalCents)}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <PickupNoticeClient />

        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">Subtotal</span>
            <span className="text-lg font-bold text-ink">
              {formatPrice(subtotal)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Sin cargo de envío: retirás en el local.
          </p>
          <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
            <span className="font-semibold text-ink">Total</span>
            <span className="text-xl font-extrabold text-brand">
              {formatPrice(subtotal)}
            </span>
          </div>
          <Link
            href="/checkout"
            className="mt-4 block rounded-full bg-brand px-6 py-3 text-center text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Iniciar compra
          </Link>
          <Link
            href="/productos"
            className="mt-2 block text-center text-sm text-brand hover:underline"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
