import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { CategoryForm } from "@/components/category-form";
import { CategoryDeleteButton } from "@/components/category-delete-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar categoría", robots: { index: false } };

export default async function EditarCategoria({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [category, parentOptions] = await Promise.all([
    db.category.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!category) notFound();

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/categorias" className="text-sm text-brand hover:underline">
        ← Volver a categorías
      </Link>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-2xl font-extrabold text-ink">{category.name}</h1>
        <Link
          href={`/categoria/${category.slug}`}
          target="_blank"
          className="text-sm text-brand hover:underline"
        >
          Ver en la tienda ↗
        </Link>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_16rem]">
        <CategoryForm
          categoryId={category.id}
          parentOptions={parentOptions}
          initial={{
            name: category.name,
            slug: category.slug,
            description: category.description ?? "",
            imageUrl: category.imageUrl ?? "",
            parentId: category.parentId ?? "",
            position: category.position,
            isActive: category.isActive,
          }}
        />

        <aside>
          <h2 className="text-sm font-bold text-ink">Baja</h2>
          <p className="mt-1 text-xs text-muted">
            Si tiene productos o subcategorías, se desactiva en vez de borrarse.
          </p>
          <div className="mt-2">
            <CategoryDeleteButton id={category.id} />
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}
