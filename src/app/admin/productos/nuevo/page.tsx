import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { ProductCreateForm } from "@/components/product-create-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo producto", robots: { index: false } };

export default async function NuevoProducto() {
  const admin = await requireAdmin();
  const categories = await db.category.findMany({
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/productos" className="text-sm text-brand hover:underline">
        ← Volver a productos
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Nuevo producto</h1>
      <p className="mt-1 text-sm text-muted">
        Completá los datos. Podés editarlo después.
      </p>
      <div className="mt-6">
        <ProductCreateForm categories={categories} />
      </div>
    </AdminShell>
  );
}
