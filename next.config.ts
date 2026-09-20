import type { NextConfig } from "next";

// En el server la tienda se sirve bajo https://zestech.com.ar/libreria, así que
// Next necesita saber su basePath para prefijar rutas y assets. En local la
// variable no está y la app corre en la raíz, sin cambios.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  // Necesario para la imagen de producción del Dockerfile (etapa runner).
  output: "standalone",
  basePath,
  images: {
    remotePatterns: [
      // Fotos que todavía viven en el CDN de la tienda vieja, para poder
      // migrar el catálogo sin volver a fotografiar todo.
      { protocol: "https", hostname: "dcdn-us.mitiendanube.com" },
      { protocol: "https", hostname: "acdn-us.mitiendanube.com" },
    ],
  },
};

export default nextConfig;
