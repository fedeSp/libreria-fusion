import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { CategoryToggle } from "@/components/category-toggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categorías", robots: { index: false } };

export default async function CategoriasAdmin() {
  const admin = await requireAdmin();

  const categories = await db.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true, children: true } },
    },
  });

  // Raíces primero, después sus hijas debajo (mismo orden, agrupadas) — así se
  // ve la jerarquía sin tener que armar un árbol completo para dos niveles.
  const roots = categories.filter((c) => !c.parentId);
  const orphanChildren = categories.filter(
    (c) => c.parentId && !categories.some((p) => p.id === c.parentId),
  );
  const rows = [
    ...roots.flatMap((r) => [r, ...categories.filter((c) => c.parentId === r.id)]),
    ...orphanChildren,
  ];

  return (
    <AdminShell adminName={admin.name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-extrabold text-ink">Categorías</h1>
          <span className="text-sm text-muted">{categories.length} en total</span>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/categorias/importar"
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Importar CSV
          </Link>
          <Link
            href="/admin/categorias/nueva"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Nueva categoría
          </Link>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Todavía no cargaste ninguna categoría.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Productos</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/categorias/${c.id}`}
                      className={`font-semibold text-brand hover:underline ${c.parentId ? "ml-6" : ""}`}
                    >
                      {c.parentId ? "↳ " : ""}
                      {c.name}
                    </Link>
                    {c._count.children > 0 && (
                      <span className="ml-1 text-xs text-muted">
                        ({c._count.children} {c._count.children === 1 ? "subcategoría" : "subcategorías"})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{c._count.products}</td>
                  <td className="px-4 py-3">
                    <CategoryToggle id={c.id} isActive={c.isActive} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/categorias/${c.id}`}
                      className="text-sm font-semibold text-brand hover:underline"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
