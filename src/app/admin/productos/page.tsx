import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { LOW_STOCK } from "@/lib/alerts";
import { AdminShell } from "@/components/admin-shell";
import { ProductToggles } from "@/components/product-toggles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Productos", robots: { index: false } };

export default async function ProductosAdmin() {
  const admin = await requireAdmin();

  const products = await db.product.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      variants: { select: { name: true, priceCents: true, stock: true, isActive: true } },
    },
  });

  return (
    <AdminShell adminName={admin.name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-extrabold text-ink">Productos</h1>
          <span className="text-sm text-muted">{products.length} en total</span>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export/productos"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Exportar CSV
          </a>
          <Link
            href="/admin/productos/importar"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Importar CSV
          </Link>
          <Link
            href="/admin/productos/nuevo"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Producto</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold">Precio</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => {
              const prices = p.variants.map((v) => v.priceCents);
              const min = prices.length ? Math.min(...prices) : 0;
              const stock = p.variants.reduce((s, v) => s + v.stock, 0);
              // El total suma todas las variantes, así que un color agotado
              // puede quedar escondido detrás de un número que parece sano
              // (ej: 38 unidades repartidas en 6 colores, uno con 3). Por eso
              // se marca cada variante puntual, no solo el total.
              const activeVariants = p.variants.filter((v) => v.isActive);
              const outVariants = activeVariants.filter((v) => v.stock <= 0);
              const lowVariants = activeVariants.filter(
                (v) => v.stock > 0 && v.stock <= LOW_STOCK,
              );
              return (
                <tr key={p.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="ml-1 text-xs text-muted">
                      ({p.variants.length} {p.variants.length === 1 ? "variante" : "variantes"})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink">{formatPrice(min)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${stock <= 0 ? "text-danger" : "text-ink"}`}>
                      {stock}
                    </span>
                    {outVariants.length > 0 && (
                      <p className="mt-0.5 text-xs text-danger">
                        Agotado: {outVariants.map((v) => v.name).join(", ")}
                      </p>
                    )}
                    {lowVariants.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted">
                        ⚠️ Stock bajo: {lowVariants.map((v) => `${v.name} (${v.stock})`).join(", ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ProductToggles id={p.id} isActive={p.isActive} isFeatured={p.isFeatured} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="text-sm font-semibold text-brand hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
