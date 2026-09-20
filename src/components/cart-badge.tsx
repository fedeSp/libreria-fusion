"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

// El link al carrito con el contador de ítems. Client component porque el
// carrito vive en el navegador.
export function CartBadge() {
  const { count, hydrated } = useCart();

  return (
    <Link
      href="/carrito"
      className="relative ml-auto rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark md:ml-0"
    >
      Mi carrito
      {hydrated && count > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-fuchsia px-1 text-xs font-bold text-white"
          aria-label={`${count} ítems en el carrito`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
