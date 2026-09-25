import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";
import { PickupNotice } from "@/components/pickup-notice";
import { HeroSlider } from "@/components/hero-slider";
import { InstagramFeed } from "@/components/instagram-feed";

// Catálogo y home se releen seguido pero no en cada request.
// Se renderiza por request: la data sale de Postgres, que no existe en build.
export const dynamic = "force-dynamic";

const CARD_SELECT = {
  slug: true,
  name: true,
  summary: true,
  images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
  variants: { where: { isActive: true }, select: { priceCents: true, stock: true } },
} as const;

export default async function HomePage() {
  const [slides, categories, featured, latest] = await Promise.all([
    db.heroSlide.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: { id: true, imageUrl: true, alt: true, linkUrl: true },
    }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { position: "asc" },
    }),
    db.product.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: CARD_SELECT,
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: CARD_SELECT,
    }),
  ]);

  // Colores decorativos de las tarjetas de categoría. No llevan texto encima:
  // el nombre va debajo, en tinta oscura sobre blanco.
  const tints = ["bg-accent-fuchsia", "bg-accent-green", "bg-accent-yellow"];

  return (
    <>
      {slides.length > 0 ? (
        <HeroSlider slides={slides} />
      ) : (
        // Sin imágenes cargadas la portada no puede quedar hueca arriba: vuelve
        // el saludo de siempre, que además explica cómo funciona la tienda.
        <section className="border-b border-line bg-brand-softer">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            Todo para el aula, la oficina y el negocio
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted">
            Somos una librería de barrio en Villa Bosch. Elegí online, pagá con
            Mercado Pago y pasá a retirarlo cuando te quede cómodo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/productos"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Ver el catálogo
            </Link>
            <Link
              href="/como-comprar"
              className="rounded-full border border-brand px-6 py-3 text-sm font-semibold text-brand hover:bg-white"
            >
              Cómo comprar
            </Link>
          </div>
        </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-xl font-bold text-ink">Nuestras líneas</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              // Toda la tarjeta es un link. En la tienda vieja estos bloques
              // eran imágenes sin <a>: se veían clickeables y no hacían nada.
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="group overflow-hidden rounded-xl border border-line bg-white transition hover:border-brand/40 hover:shadow-md"
              >
                {c.imageUrl ? (
                  // Con foto, el nombre NO va encima: sobre una imagen
                  // cualquiera no hay color de texto que garantice contraste,
                  // y el nombre ya está justo abajo, en tinta sobre blanco.
                  // 5:4, la proporción en la que vienen diseñadas las piezas:
                  // con la tarjeta apaisada de antes, object-cover les comía el
                  // nombre de la categoría por arriba y por abajo.
                  <div className="relative aspect-[5/4]">
                    <Image
                      src={c.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div
                    className={`flex aspect-[5/4] items-center justify-center ${tints[i % tints.length]}`}
                  >
                    <span className="text-2xl font-extrabold uppercase tracking-wide text-white">
                      {c.name}
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-ink group-hover:text-brand">
                    Línea {c.name}
                  </h3>
                  {c.description && (
                    <p className="mt-1 text-sm text-muted">{c.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-ink">Destacados</h2>
            <Link href="/productos" className="text-sm font-medium text-brand hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <h2 className="text-xl font-bold text-ink">Últimos ingresos</h2>
          <div className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {latest.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <PickupNotice />
      </section>

      <InstagramFeed />
    </>
  );
}
