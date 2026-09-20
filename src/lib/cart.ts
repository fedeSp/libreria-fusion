// Lógica pura del carrito, sin React ni DOM, para poder usarla igual en el
// cliente (contexto + localStorage) y en el servidor (revalidación en checkout).

// Lo que el navegador guarda por cada línea. A propósito NO guarda el precio:
// el precio autoritativo sale de la base en el checkout, así el carrito no
// puede "recordar" un precio viejo ni ser manipulado.
export type CartLine = {
  variantId: string;
  quantity: number;
};

// Línea ya resuelta contra la base, lista para mostrar con precio y stock.
export type ResolvedLine = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  imageUrl: string | null;
  imageAlt: string;
  unitPriceCents: number;
  stock: number;
  quantity: number;
  lineTotalCents: number;
};

export const CART_STORAGE_KEY = "fusion.cart.v1";
const MAX_PER_LINE = 99;

export function addLine(lines: CartLine[], variantId: string, qty = 1): CartLine[] {
  const existing = lines.find((l) => l.variantId === variantId);
  if (existing) {
    return lines.map((l) =>
      l.variantId === variantId
        ? { ...l, quantity: clampQty(l.quantity + qty) }
        : l,
    );
  }
  return [...lines, { variantId, quantity: clampQty(qty) }];
}

export function setQty(lines: CartLine[], variantId: string, qty: number): CartLine[] {
  if (qty <= 0) return removeLine(lines, variantId);
  return lines.map((l) =>
    l.variantId === variantId ? { ...l, quantity: clampQty(qty) } : l,
  );
}

export function removeLine(lines: CartLine[], variantId: string): CartLine[] {
  return lines.filter((l) => l.variantId !== variantId);
}

export function totalItems(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function subtotalCents(lines: ResolvedLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
}

function clampQty(qty: number): number {
  return Math.max(1, Math.min(MAX_PER_LINE, Math.floor(qty)));
}

// Descarta cualquier cosa que no tenga forma de línea válida: el localStorage
// es editable por el usuario, así que lo tratamos como entrada no confiable.
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (l): l is CartLine =>
          l &&
          typeof l.variantId === "string" &&
          typeof l.quantity === "number" &&
          l.quantity > 0,
      )
      .map((l) => ({ variantId: l.variantId, quantity: clampQty(l.quantity) }));
  } catch {
    return [];
  }
}
