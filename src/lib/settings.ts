import { cache } from "react";
import { db } from "./db";

// Valores por defecto: si la tabla está vacía la tienda igual renderiza
// algo coherente en vez de romperse o mostrar huecos.
const DEFAULTS: Record<string, string> = {
  "store.name": "Librería Fusión",
  "store.phone": "+54 9 11 3130-5791",
  "store.whatsapp": "5491131305791",
  "store.email": "fusionlibreriapapelera@gmail.com",
  "store.address": "Santos Vega 7196, Villa Bosch — Tres de Febrero",
  "store.hours": "Lunes a viernes de 9 a 13 y de 16 a 19:30 · Sábados de 9 a 13",
  "store.cuit": "27240307583",
  "pickup.notice": "Retirá en el local o pedí envío a domicilio.",
  "pickup.detail":
    "Cuando tu pedido esté listo te avisamos por WhatsApp o mail. Lo guardamos 7 días desde el aviso.",
  "instagram.url": "https://instagram.com/fusionlibreria",
  // Links de posteos a mostrar en la home, uno por linea. Vacio = la
  // seccion de Instagram no aparece.
  "instagram.posts": "",
  "facebook.url": "https://www.facebook.com/libreriafusion/",
  "tiktok.url": "https://www.tiktok.com/@fusion.libreria",
};

export type Settings = Record<string, string>;

// cache() dedupe: una sola consulta por request aunque la llamen
// el header, el footer y la página al mismo tiempo.
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const rows = await db.storeSetting.findMany();
    const fromDb = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return { ...DEFAULTS, ...fromDb };
  } catch {
    // Si la base todavía no está migrada, la tienda no debería caerse entera.
    return DEFAULTS;
  }
});

/** Link de WhatsApp bien formado. El de la tienda vieja tenía el 0 de 011 y no funcionaba. */
export function whatsappUrl(number: string, message?: string): string {
  const clean = number.replace(/\D/g, "");
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
