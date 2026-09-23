import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { ProductEditForm } from "@/components/product-edit-form";
import { ProductDeleteButton } from "@/components/product-delete-button";
import { ImageManager } from "@/components/image-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar producto", robots: { index: false } };

export default async function EditarProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
      },
    }),
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/productos" className="text-sm text-brand hover:underline">
        ← Volver a productos
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-extrabold text-ink">{product.name}</h1>
        <Link
          href={`/productos/${product.slug}`}
          target="_blank"
          className="text-sm text-brand hover:underline"
        >
          Ver en la tienda ↗
        </Link>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_16rem]">
        <ProductEditForm
          productId={product.id}
          categories={categories}
          initial={{
            name: product.name,
            summary: product.summary ?? "",
            description: product.description ?? "",
            categoryId: product.categoryId ?? "",
          }}
          variants={product.variants.map((v) => ({
            id: v.id,
            name: v.name,
            priceCents: v.priceCents,
            stock: v.stock,
            sku: v.sku ?? "",
          }))}
        />

        <aside>
          <h2 className="text-sm font-bold text-ink">Fotos</h2>
          <div className="mt-2">
            <ImageManager
              productId={product.id}
              productName={product.name}
              images={product.images.map((img) => ({
                id: img.id,
                url: img.url,
                alt: img.alt,
                variantId: img.variantId,
              }))}
              variants={product.variants.map((v) => ({ id: v.id, name: v.name }))}
            />
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <h2 className="text-sm font-bold text-ink">Baja</h2>
            <p className="mt-1 text-xs text-muted">
              Si el producto ya se vendió, se desactiva en vez de borrarse.
            </p>
            <div className="mt-2">
              <ProductDeleteButton id={product.id} />
            </div>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
