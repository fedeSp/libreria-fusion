import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { CategoryForm } from "@/components/category-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva categoría", robots: { index: false } };

export default async function NuevaCategoria() {
  const admin = await requireAdmin();
  const parentOptions = await db.category.findMany({
    orderBy: { position: "asc" },
    select: { id: true, name: true },
  });

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/categorias" className="text-sm text-brand hover:underline">
        ← Volver a categorías
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Nueva categoría</h1>
      <div className="mt-6">
        <CategoryForm parentOptions={parentOptions} />
      </div>
    </AdminShell>
  );
}
