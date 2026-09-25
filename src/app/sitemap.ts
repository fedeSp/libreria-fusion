import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";

// El sitemap se arma desde la base, no a mano: un producto nuevo aparece acá
// sin que nadie tenga que acordarse de agregarlo.
export const dynamic = "force-dynamic";

const PAGINAS_FIJAS = [
  { ruta: "", prioridad: 1 },
  { ruta: "/productos", prioridad: 0.9 },
  { ruta: "/como-comprar", prioridad: 0.5 },
  { ruta: "/preguntas-frecuentes", prioridad: 0.5 },
  { ruta: "/quienes-somos", prioridad: 0.4 },
  { ruta: "/contacto", prioridad: 0.4 },
  { ruta: "/devoluciones", prioridad: 0.3 },
  { ruta: "/arrepentimiento", prioridad: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categorias, productos] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]).catch(() => [[], []] as const);

  return [
    ...PAGINAS_FIJAS.map((p) => ({
      url: `${SITE_URL}${p.ruta}`,
      lastModified: new Date(),
      priority: p.prioridad,
    })),
    ...categorias.map((c) => ({
      url: `${SITE_URL}/categoria/${c.slug}`,
      lastModified: c.updatedAt,
      priority: 0.8,
    })),
    ...productos.map((p) => ({
      url: `${SITE_URL}/productos/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.7,
    })),
  ];
}
