import Image from "next/image";
import Link from "next/link";
import { formatPrice, installment } from "@/lib/money";

export type ProductCardData = {
  slug: string;
  name: string;
  summary: string | null;
  images: { url: string; alt: string }[];
  variants: { priceCents: number; stock: number }[];
};

export function ProductCard({ product }: { product: ProductCardData }) {
  const cover = product.images[0];
  // Los productos con variantes muestran el precio más bajo, como "desde".
  const prices = product.variants.map((v) => v.priceCents);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const hasRange = prices.length > 1 && Math.max(...prices) !== minPrice;
  const inStock = product.variants.some((v) => v.stock > 0);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition hover:border-brand/40 hover:shadow-md">
      <Link
        href={`/productos/${product.slug}`}
        className="flex h-full flex-col focus-visible:outline-none"
      >
        {/* Relación fija: en la tienda vieja las tarjetas quedaban desalineadas
            porque cada foto tenía su propio alto. */}
        <div className="relative aspect-square w-full overflow-hidden bg-brand-softer">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-3 transition group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Sin foto
            </div>
          )}
          {!inStock && (
            <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-1 text-xs font-semibold text-white">
              Sin stock
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold leading-snug text-ink group-hover:text-brand">
            {product.name}
          </h3>
          {product.summary && (
            <p className="mt-1 line-clamp-2 text-xs text-muted">
              {product.summary}
            </p>
          )}

          <div className="mt-auto pt-3">
            <p className="text-lg font-bold text-brand">
              {hasRange && (
                <span className="text-sm font-medium text-muted">desde </span>
              )}
              {formatPrice(minPrice)}
            </p>
            <p className="text-xs text-muted">
              3 cuotas sin interés de {installment(minPrice, 3)}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
