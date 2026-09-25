import Link from "next/link";
import { db } from "@/lib/db";
import { PickupNotice } from "./pickup-notice";
import { CartBadge } from "./cart-badge";
import { StoreWordmark } from "./store-wordmark";
import { getSettings } from "@/lib/settings";

// Los <Link> de Next prefijan el basePath solos, pero el action de un <form>
// no: hay que anteponérselo a mano cuando la tienda vive bajo /libreria.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function SiteHeader() {
  // El menú se arma desde las categorías reales de la base. En la tienda vieja
  // el link "Productos" apuntaba a una categoría vacía y nadie se enteró:
  // acá no hay destinos escritos a mano que puedan quedar desactualizados.
  const settings = await getSettings();

  const categories = await db.category
    .findMany({
      where: { isActive: true, parentId: null },
      orderBy: { position: "asc" },
      select: { name: true, slug: true },
    })
    .catch(() => []);

  return (
    <header>
      <PickupNotice variant="banner" />

      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
          {/* El nombre sale de Ajustes, no escrito acá: si el local lo
              cambia, el título lo acompaña. */}
          <Link href="/" className="shrink-0">
            <StoreWordmark name={settings["store.name"]} />
          </Link>

          <form
            action={`${basePath}/productos`}
            className="ml-auto hidden flex-1 md:block"
          >
            <label htmlFor="q" className="sr-only">
              Buscar productos
            </label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Buscar cuadernos, carpetas, resmas…"
              className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink placeholder:text-muted focus:border-brand"
            />
          </form>

          <CartBadge />
        </div>

        <nav aria-label="Categorías" className="mx-auto max-w-6xl px-4 pb-3">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium">
            <li>
              <Link href="/productos" className="text-ink hover:text-brand">
                Todos los productos
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categoria/${c.slug}`}
                  className="text-ink hover:text-brand"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li className="ml-auto">
              <Link href="/como-comprar" className="text-muted hover:text-brand">
                Cómo comprar
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="text-muted hover:text-brand">
                Contacto
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
