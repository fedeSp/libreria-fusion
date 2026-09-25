import type { MetadataRoute } from "next";
import { SITE_URL, TIENDA_INDEXABLE } from "@/lib/seo";

// Reemplaza al robots.txt estático: así no puede quedar contradiciendo al
// noindex de la metadata, porque los dos salen del mismo interruptor.
export default function robots(): MetadataRoute.Robots {
  if (!TIENDA_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    // El panel y la API no tienen nada que hacer en un buscador.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
