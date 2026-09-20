import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice, installment } from "@/lib/money";
import { PickupNotice } from "@/components/pickup-notice";
import { ProductCard } from "@/components/product-card";
import { ProductViewer } from "@/components/product-viewer";

// Se renderiza por request: la data sale de Postgres, que no existe en build.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true }, orderBy: { position: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Producto no encontrado" };

  // Si el producto no trae SEO propio se arma uno decente solo, en vez de
  // repetir el nombre en mayúsculas como hacía la tienda vieja.
  const title = product.metaTitle ?? product.name;
  const description =
    product.metaDescription ??
    product.summary ??
    `${product.name}. Comprá online en Librería Fusión y retiralo en Villa Bosch, Tres de Febrero.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const prices = product.variants.map((v) => v.priceCents);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const hasVariants = product.variants.length > 1;

  const related = await db.product.findMany({
    where: {
      isActive: true,
      slug: { not: product.slug },
      ...(product.categoryId ? { categoryId: product.categoryId } : {}),
    },
    take: 4,
    select: {
      slug: true,
      name: true,
      summary: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
      variants: { where: { isActive: true }, select: { priceCents: true, stock: true } },
    },
  });

  // Datos estructurados de producto: la tienda vieja no los tenía, así que
  // Google no mostraba precio ni disponibilidad en los resultados.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.summary ?? product.description ?? undefined,
    image: product.images.map((i) => i.url),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "ARS",
      price: (minPrice / 100).toFixed(2),
      availability:
        totalStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Miga de pan" className="text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Inicio
        </Link>
        <span aria-hidden="true"> › </span>
        {product.category && (
          <>
            <Link
              href={`/categoria/${product.category.slug}`}
              className="hover:text-brand"
            >
              {product.category.name}
            </Link>
            <span aria-hidden="true"> › </span>
          </>
        )}
        <span className="text-ink">{product.name}</span>
      </nav>

      <div className="mt-5">
        <ProductViewer
          images={product.images.map((img) => ({
            id: img.id,
            url: img.url,
            alt: img.alt,
            variantId: img.variantId,
          }))}
          variants={product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            stock: v.stock,
          }))}
          hasRealVariants={hasVariants}
          beforePurchase={
            <>
              <h1 className="text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
                {product.name}
              </h1>
              {product.brand && (
                <p className="mt-1 text-sm text-muted">Marca: {product.brand.name}</p>
              )}

              <p className="mt-4 text-3xl font-extrabold text-brand">
                {formatPrice(minPrice)}
              </p>
              <p className="mt-1 text-sm text-muted">
                3 cuotas sin interés de{" "}
                <span className="font-semibold text-ink">
                  {installment(minPrice, 3)}
                </span>
              </p>

              <p className="mt-4 text-sm">
                {totalStock > 0 ? (
                  <span className="font-semibold text-success">
                    Disponible · {totalStock}{" "}
                    {totalStock === 1 ? "unidad" : "unidades"} en stock
                  </span>
                ) : (
                  <span className="font-semibold text-danger">Sin stock por ahora</span>
                )}
              </p>
            </>
          }
          afterPurchase={
            <>
              <div className="mt-6">
                <PickupNotice />
              </div>

              {product.description && (
                <div className="mt-8">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
                    Descripción
                  </h2>
                  <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink">
                    {product.description.split("\n\n").map((par, i) => (
                      <p key={i}>{par}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold text-ink">También te puede servir</h2>
          <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
