// Un solo interruptor para abrir la tienda a los buscadores.
//
// Mientras esté en false, la tienda pide no ser indexada en dos lugares a la
// vez —la metadata de layout.tsx y robots.txt— y los dos leen de acá, para que
// no puedan decir cosas distintas. Abrir la tienda es cambiar este booleano.

export const TIENDA_INDEXABLE = false;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
