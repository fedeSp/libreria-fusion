import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { ProductCsvImporter } from "@/components/product-csv-importer";
import { PRODUCT_CSV_HEADER } from "@/lib/catalog-csv";

export const dynamic = "force-dynamic";
export const metadata = { title: "Importar productos", robots: { index: false } };

export default async function ImportarProductos() {
  const admin = await requireAdmin();

  return (
    <AdminShell adminName={admin.name}>
      <Link href="/admin/productos" className="text-sm text-brand hover:underline">
        ← Volver a productos
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold text-ink">Importar productos desde CSV</h1>

      <div className="mt-4 max-w-3xl rounded-xl border border-line bg-white p-5 text-sm text-muted">
        <p className="font-semibold text-ink">Una fila por variante</p>
        <p className="mt-1">
          Un producto con seis colores ocupa seis filas. Las columnas del producto (nombre,
          categoría, descripción) se leen de la primera fila; en las siguientes alcanza con
          completar la variante y el precio.
        </p>

        <p className="mt-4 font-semibold text-ink">Columnas</p>
        <p className="mt-1">
          {PRODUCT_CSV_HEADER.map((h, i) => (
            <span key={h}>
              {i > 0 && ", "}
              <code className="text-ink">{h}</code>
            </span>
          ))}
          . Solo <code className="text-ink">nombre</code> y <code className="text-ink">precio</code>{" "}
          son obligatorias, y el orden de las columnas no importa.
        </p>

        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>
            Si dejás <code className="text-ink">slug</code> vacío se genera del nombre y siempre se
            crea un producto nuevo. Si ponés el slug de uno que ya existe, se actualiza.
          </li>
          <li>
            Los precios van en pesos, con coma decimal:{" "}
            <code className="text-ink">10900,50</code>.
          </li>
          <li>
            <code className="text-ink">categoria</code> va con el slug de la categoría. Si no
            existe, el producto se importa igual y te avisamos.
          </li>
          <li>
            <code className="text-ink">marca</code> se crea sola si todavía no está cargada.
          </li>
          <li>
            <code className="text-ink">imagenes</code> acepta varias URLs separadas por{" "}
            <code className="text-ink">|</code>. Se agregan a las que el producto ya tenga, sin
            repetir.
          </li>
          <li>
            Las variantes se reconocen por <code className="text-ink">sku</code>, y si no tienen,
            por el nombre de la variante.
          </li>
        </ul>

        <p className="mt-4 font-semibold text-ink">Qué no hace</p>
        <p className="mt-1">
          Nunca borra nada: una variante o una foto que esté en la tienda y no en el archivo se
          queda como está. Tampoco asigna fotos a un color puntual — eso se hace desde la ficha del
          producto.
        </p>

        <p className="mt-4">
          La forma más segura de armar el archivo es{" "}
          <strong className="text-ink">exportar el catálogo</strong>, editarlo en la planilla y
          volver a subirlo: las columnas son exactamente las mismas.
        </p>

        <div className="mt-3 flex flex-wrap gap-4">
          <a
            href="/api/admin/export/productos"
            className="font-semibold text-brand hover:underline"
          >
            Exportar el catálogo actual ↓
          </a>
          <a href="/plantilla-productos.csv" className="font-semibold text-brand hover:underline">
            Descargar plantilla de ejemplo ↓
          </a>
        </div>
      </div>

      <div className="mt-6">
        <ProductCsvImporter />
      </div>
    </AdminShell>
  );
}
