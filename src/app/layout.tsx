import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Librería Fusión — Librería y papelera en Villa Bosch",
    template: "%s | Librería Fusión",
  },
  description:
    "Librería, papelera y artículos comerciales en Villa Bosch, Tres de Febrero. Comprá online y retirá en el local.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Librería Fusión",
  },
  // Mientras el checkout no está terminado la tienda no debe aparecer en Google.
  robots: { index: false, follow: false },
};

// Layout raíz mínimo: solo html/body y estilos. El chrome de la tienda vive en
// el grupo (store); el panel de admin trae el suyo. Así el admin no arrastra el
// header ni el carrito de la tienda.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
