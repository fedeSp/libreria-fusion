import { getSettings, whatsappUrl } from "@/lib/settings";
import { SITE_URL } from "@/lib/seo";

// Datos estructurados (JSON-LD): lo que le explica a Google qué es esto.
//
// No cambia nada de lo que ve una persona. Sirve para que en los resultados
// aparezca la dirección, el horario y el precio en vez de un link pelado, y
// para que el negocio se entienda como un local con dirección física y no como
// una web cualquiera — que es de lo que depende salir en las búsquedas "cerca
// mío".

function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // El contenido lo generamos nosotros con JSON.stringify, no viene de
      // afuera: no hay nada que un tercero pueda inyectar acá.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** El local: dirección, teléfono, horarios y redes. Va en la portada. */
export async function NegocioJsonLd() {
  const s = await getSettings();

  // La dirección se guarda como un texto solo ("Santos Vega 7196, Villa Bosch
  // — Tres de Febrero") porque es lo que se muestra en el footer. Para el dato
  // estructurado hace falta partida, y la coma alcanza: lo de antes es la
  // calle, lo de después la localidad.
  const [calle, ...resto] = s["store.address"].split(",");
  const localidad = (resto.join(",").split("—")[0] ?? "").trim();

  const redes = [s["instagram.url"], s["facebook.url"], s["tiktok.url"]].filter(Boolean);

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Store",
        name: s["store.name"],
        url: SITE_URL,
        image: `${SITE_URL}/opengraph-image.png`,
        telephone: s["store.phone"],
        email: s["store.email"],
        address: {
          "@type": "PostalAddress",
          streetAddress: calle.trim(),
          addressLocality: localidad,
          addressRegion: s["store.provincia"],
          postalCode: s["store.codigoPostal"],
          addressCountry: "AR",
        },
        // El texto tal cual lo escribe el local. Google lo lee igual, y no hay
        // forma de convertir "9 a 13 y de 16 a 19:30" en algo estructurado sin
        // adivinar.
        openingHours: s["store.hours"],
        sameAs: redes,
        ...(s["store.whatsapp"] && {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            url: whatsappUrl(s["store.whatsapp"]),
          },
        }),
      }}
    />
  );
}
