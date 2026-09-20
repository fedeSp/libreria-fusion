import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Catálogo completo de Librería Fusión: escolar, comercial y papelera. Comprá online y retirá en Villa Bosch.",
};

// Se renderiza por request: la data sale de Postgres, que no existe en build.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; orden?: string }>;
};

const ORDERS = {
  nuevos: { label: "Más nuevos", orderBy: { createdAt: "desc" } },
  az: { label: "A - Z", orderBy: { name: "asc" } },
  za: { label: "Z - A", orderBy: { name: "desc" } },
} as const;

type OrderKey = keyof typeof ORDERS;

export default async function ProductosPage({ searchParams }: Props) {
  const { q, orden } = await searchParams;
  const query = q?.trim() ?? "";
  const orderKey: OrderKey =
    orden && orden in ORDERS ? (orden as OrderKey) : "nuevos";

  const products = await db.product.findMany({
    where: {
      isActive: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { summary: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
              { brand: { name: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    orderBy: ORDERS[orderKey].orderBy,
    select: {
      slug: true,
      name: true,
      summary: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
      variants: { where: { isActive: true }, select: { priceCents: true, stock: true } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        <span className="text-ink">Productos</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">
            {query ? `Resultados para "${query}"` : "Todos los productos"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {products.length}{" "}
            {products.length === 1 ? "producto" : "productos"}
          </p>
        </div>

        <form className="flex items-center gap-2">
          {query && <input type="hidden" name="q" value={query} />}
          <label htmlFor="orden" className="text-sm text-muted">
            Ordenar por
          </label>
          <select
            id="orden"
            name="orden"
            defaultValue={orderKey}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {Object.entries(ORDERS).map(([key, o]) => (
              <option key={key} value={key}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-softer"
          >
            Aplicar
          </button>
        </form>
      </div>

      {products.length === 0 ? (
        // La tienda vieja dejaba al cliente en un callejón sin salida acá.
        <div className="mt-10 rounded-xl border border-line bg-white p-8 text-center">
          <p className="text-lg font-semibold text-ink">
            No encontramos nada con esa búsqueda
          </p>
          <p className="mt-2 text-sm text-muted">
            Probá con otra palabra, mirá el catálogo completo, o escribinos y lo
            buscamos por vos: muchas cosas están en el local aunque todavía no
            estén cargadas acá.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/productos"
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Ver todo el catálogo
            </Link>
            <Link
              href="/contacto"
              className="rounded-full border border-brand px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand-softer"
            >
              Consultanos
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
