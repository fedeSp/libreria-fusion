import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";

// Se renderiza por request: la data sale de Postgres, que no existe en build.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });
  if (!category) return { title: "Categoría no encontrada" };

  return {
    title: category.name,
    description:
      category.description ??
      `Productos de ${category.name} en Librería Fusión. Comprá online y retirá en Villa Bosch.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await db.category.findFirst({
    where: { slug, isActive: true },
  });
  if (!category) notFound();

  const products = await db.product.findMany({
    where: { isActive: true, categoryId: category.id },
    orderBy: { createdAt: "desc" },
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
        <span className="text-ink">{category.name}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-extrabold text-ink">{category.name}</h1>
      {category.description && (
        <p className="mt-1 max-w-2xl text-sm text-muted">{category.description}</p>
      )}

      {products.length === 0 ? (
        // Una categoría vacía nunca debería ser un cartel de error: la vieja
        // tienda mostraba "No tenemos resultados para tu búsqueda" y nada más.
        <div className="mt-8 rounded-xl border border-line bg-white p-8 text-center">
          <p className="text-lg font-semibold text-ink">
            Todavía no cargamos productos de {category.name}
          </p>
          <p className="mt-2 text-sm text-muted">
            Estamos sumando el catálogo de a poco. Mientras tanto podés ver el
            resto de la tienda o preguntarnos por lo que necesites.
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
        <>
          <p className="mt-4 text-sm text-muted">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
