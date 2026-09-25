import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin-shell";
import { HeroSlideManager } from "@/components/hero-slide-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Portada", robots: { index: false } };

export default async function PortadaAdmin() {
  const admin = await requireAdmin();

  const slides = await db.heroSlide.findMany({
    orderBy: { position: "asc" },
    select: { id: true, imageUrl: true, alt: true, linkUrl: true, isActive: true },
  });

  const visibles = slides.filter((s) => s.isActive).length;

  return (
    <AdminShell adminName={admin.name}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-extrabold text-ink">Portada</h1>
          <span className="text-sm text-muted">
            {visibles === 0
              ? "ninguna imagen visible"
              : `${visibles} ${visibles === 1 ? "imagen visible" : "imágenes visibles"}`}
          </span>
        </div>
        <Link href="/" className="text-sm font-medium text-brand hover:underline">
          Ver la tienda ↗
        </Link>
      </div>

      <p className="mt-1 max-w-2xl text-sm text-muted">
        Las imágenes se van pasando solas arriba de todo en la página principal. Se muestran en el
        orden de esta lista, y el carrusel se frena solo cuando alguien pasa el mouse por encima.
      </p>

      <div className="mt-6">
        <HeroSlideManager slides={slides} />
      </div>
    </AdminShell>
  );
}
