"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "./cart-provider";

export type ViewerImage = { id: string; url: string; alt: string; variantId: string | null };
export type ViewerVariant = { id: string; name: string; stock: number };

type Props = {
  images: ViewerImage[];
  variants: ViewerVariant[];
  // true cuando el producto tiene una sola variante "Único": no mostramos selector.
  hasRealVariants: boolean;
  // JSX servido por el server component (título, precio, stock) que va antes
  // y después del selector — se intercala así para que la galería y el
  // selector de color compartan un solo estado sin volver todo el bloque cliente.
  beforePurchase: React.ReactNode;
  afterPurchase: React.ReactNode;
};

// Combina la galería de fotos con el selector de variante y el carrito: las
// tres cosas comparten el color elegido, así que viven en un solo componente.
export function ProductViewer({
  images,
  variants,
  hasRealVariants,
  beforePurchase,
  afterPurchase,
}: Props) {
  const { add, lines } = useCart();
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstInStock?.id ?? "");
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const selected = variants.find((v) => v.id === selectedId);
  const inCart = lines.find((l) => l.variantId === selectedId)?.quantity ?? 0;
  const canAdd = selected && selected.stock > 0 && inCart + qty <= selected.stock;

  // Fotos de la variante elegida; si no tiene propias, las generales del
  // producto (sin variante asignada); si tampoco hay generales, todas.
  const ofVariant = images.filter((i) => i.variantId === selectedId);
  const general = images.filter((i) => !i.variantId);
  const gallery = ofVariant.length > 0 ? ofVariant : general.length > 0 ? general : images;
  const main = gallery[activeImage] ?? gallery[0];

  useEffect(() => {
    setActiveImage(0);
  }, [selectedId]);

  function handleAdd() {
    if (!selected || !canAdd) return;
    add(selected.id, qty);
    setJustAdded(true);
    setQty(1);
    window.setTimeout(() => setJustAdded(false), 3500);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Galería */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-white">
          {main ? (
            <Image
              key={main.id}
              src={main.url}
              alt={main.alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-6"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">Sin foto</div>
          )}
        </div>

        {gallery.length > 1 && (
          <ul className="mt-3 grid grid-cols-5 gap-2">
            {gallery.map((image, i) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  aria-current={i === activeImage}
                  className={`relative aspect-square w-full overflow-hidden rounded-lg border bg-white ${
                    i === activeImage ? "border-brand" : "border-line hover:border-brand/50"
                  }`}
                >
                  <Image src={image.url} alt={image.alt} fill sizes="20vw" className="object-contain p-1" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Compra */}
      <div>
        {beforePurchase}

        <div className="mt-6">
          {hasRealVariants && (
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Color</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((v) => {
                  const disabled = v.stock <= 0;
                  const active = v.id === selectedId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedId(v.id);
                        setQty(1);
                      }}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        active
                          ? "border-brand bg-brand text-white"
                          : disabled
                            ? "border-line text-muted line-through"
                            : "border-line text-ink hover:border-brand"
                      }`}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {selected && selected.stock > 0 ? (
            <>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex items-center rounded-full border border-line">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-lg text-ink disabled:text-muted"
                    disabled={qty <= 1}
                    aria-label="Restar uno"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(selected.stock - inCart, q + 1))}
                    className="px-3 py-2 text-lg text-ink disabled:text-muted"
                    disabled={inCart + qty >= selected.stock}
                    aria-label="Sumar uno"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!canAdd}
                  className="flex-1 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Agregar al carrito
                </button>
              </div>

              {inCart > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Ya tenés {inCart} en el carrito
                  {inCart >= selected.stock && " (llegaste al stock disponible)"}.
                </p>
              )}

              {justAdded && (
                <div
                  role="status"
                  className="mt-3 flex items-center justify-between rounded-lg border border-success/30 bg-success/5 px-4 py-2 text-sm"
                >
                  <span className="font-medium text-success">Agregado al carrito</span>
                  <Link href="/carrito" className="font-semibold text-brand hover:underline">
                    Ver carrito →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <p className="mt-5 rounded-lg border border-line bg-paper px-4 py-3 text-sm font-semibold text-danger">
              Sin stock por ahora
            </p>
          )}
        </div>

        {afterPurchase}
      </div>
    </div>
  );
}
