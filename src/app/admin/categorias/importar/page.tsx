import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { CategoryCsvImporter } from "@/components/category-csv-importer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importar categorías", robots: { index: false } };

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default async function ImportarCategorias() {
  const admin = await requireAdmin();

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/categorias" className="text-sm text-brand hover:underline">
        ← Volver a categorías
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Importar categorías desde CSV</h1>

      <div className="mt-4 max-w-2xl rounded-xl border border-line bg-white p-5 text-sm text-muted">
        <p className="font-semibold text-ink">Columnas del archivo</p>
        <p className="mt-1">
          <code className="text-ink">nombre</code> (obligatoria),{" "}
          <code className="text-ink">slug</code>, <code className="text-ink">categoria_padre</code>,{" "}
          <code className="text-ink">descripcion</code>, <code className="text-ink">orden</code> y{" "}
          <code className="text-ink">activa</code>. El orden de las columnas no importa.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Si dejás <code className="text-ink">slug</code> vacío, se genera solo del nombre y
            siempre se crea una categoría nueva.
          </li>
          <li>
            Si completás <code className="text-ink">slug</code> con el de una categoría que ya
            existe, se actualiza en vez de duplicarse.
          </li>
          <li>
            <code className="text-ink">categoria_padre</code> va con el slug de otra fila del mismo
            archivo o de una categoría ya cargada.
          </li>
        </ul>
        <p className="mt-3">
          La forma más segura de armar el archivo es{" "}
          <strong className="text-ink">exportar las categorías</strong>, editarlas en la planilla y
          volver a subirlas: las columnas son exactamente las mismas.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <a
            href="/api/admin/export/categorias"
            className="font-semibold text-brand hover:underline"
          >
            Exportar las categorías actuales ↓
          </a>
          <a
            href={`${basePath}/plantilla-categorias.csv`}
            className="font-semibold text-brand hover:underline"
          >
            Descargar plantilla de ejemplo ↓
          </a>
        </div>
      </div>

      <div className="mt-6">
        <CategoryCsvImporter />
      </div>
    </AdminShell>
  );
}
