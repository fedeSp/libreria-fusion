"use server";

import { resolveLines } from "@/lib/checkout";
import { subtotalCents, type CartLine, type ResolvedLine } from "@/lib/cart";

// El carrito vive en el navegador; esta acción le devuelve las líneas resueltas
// contra la base (precio, foto, stock actual) para mostrarlas y totalizar.
export async function resolveCartAction(
  lines: CartLine[],
): Promise<{ lines: ResolvedLine[]; subtotalCents: number }> {
  const resolved = await resolveLines(lines);
  return { lines: resolved, subtotalCents: subtotalCents(resolved) };
}
