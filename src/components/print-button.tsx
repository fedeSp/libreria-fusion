"use client";

import { useEffect } from "react";

// Dispara el diálogo de impresión solo al entrar a la página (así el admin no
// tiene que buscar el botón), y deja el botón visible por si lo cierra y
// quiere reintentar. print:hidden lo saca de la hoja impresa.
export function PrintButton() {
  useEffect(() => {
    const id = window.setTimeout(() => window.print(), 200);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
    >
      Imprimir
    </button>
  );
}
