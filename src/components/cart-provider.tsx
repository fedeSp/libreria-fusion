"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addLine,
  CART_STORAGE_KEY,
  type CartLine,
  parseStoredCart,
  removeLine,
  setQty,
  totalItems,
} from "@/lib/cart";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  hydrated: boolean;
  add: (variantId: string, qty?: number) => void;
  setQuantity: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  // Hasta leer localStorage no sabemos el carrito real; evita parpadeos y
  // desajustes de hidratación mostrando un estado neutro al inicio.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLines(parseStoredCart(localStorage.getItem(CART_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  // Persistir en cada cambio, ya hidratados.
  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  // Mantener el carrito sincronizado entre pestañas.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === CART_STORAGE_KEY) setLines(parseStoredCart(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((variantId: string, qty = 1) => {
    setLines((prev) => addLine(prev, variantId, qty));
  }, []);
  const setQuantity = useCallback((variantId: string, qty: number) => {
    setLines((prev) => setQty(prev, variantId, qty));
  }, []);
  const remove = useCallback((variantId: string) => {
    setLines((prev) => removeLine(prev, variantId));
  }, []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: totalItems(lines),
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, hydrated, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
