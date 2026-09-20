import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Las fotos siguen apuntando al CDN de la tienda vieja. Sirven para trabajar
// hoy; cuando haya subida de imágenes propia se reemplazan por /uploads/.
const CDN = "https://dcdn-us.mitiendanube.com/stores/003/664/909/products";
// El CDN de Tienda Nube solo sirve ciertos tamaños: 480 es el más grande
// disponible (1024 devuelve 403). Otra razón para migrar las fotos a local.
const img = (name: string) => `${CDN}/${name}-480-0.webp`;

async function main() {
  console.log("Sembrando base de datos...");

  // ---------------------------------------------------------- configuración
  const settings: Record<string, string> = {
    "store.name": "Librería Fusión",
    "store.phone": "+54 9 11 3130-5791",
    "store.whatsapp": "5491131305791",
    "store.email": "fusionlibreriapapelera@gmail.com",
    "store.address": "Santos Vega 7196, Villa Bosch — Tres de Febrero",
    "store.hours": "Lunes a viernes de 9 a 13 y de 16 a 19:30 · Sábados de 9 a 13",
    "store.cuit": "27240307583",
    // El aviso de retiro. Se muestra en home, ficha, carrito y checkout.
    "pickup.notice": "Retirá en el local o pedí envío a domicilio.",
    "pickup.detail":
      "Cuando tu pedido esté listo te avisamos por WhatsApp o mail. Lo guardamos 7 días desde el aviso.",
    "instagram.url": "https://instagram.com/fusionlibreria",
    "facebook.url": "https://www.facebook.com/libreriafusion/",
    "tiktok.url": "https://www.tiktok.com/@fusion.libreria",
  };

  for (const [key, value] of Object.entries(settings)) {
    // Solo crear si falta: NO pisar valores existentes. El seed corre en cada
    // deploy (servicio migrate), y estos settings se editan desde el admin
    // (Ajustes) — con `update: { value }` se perderían los cambios al redeployar.
    await db.storeSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  // ------------------------------------------------------------ medios de pago
  await db.paymentMethod.upsert({
    where: { code: "mercadopago" },
    update: {},
    create: {
      code: "mercadopago",
      label: "Mercado Pago",
      description:
        "Pagá con tarjeta de crédito, débito o dinero en cuenta. Hasta 3 cuotas sin interés.",
      isOnline: true,
      isActive: true,
      position: 0,
    },
  });

  await db.paymentMethod.upsert({
    where: { code: "efectivo" },
    update: {},
    create: {
      code: "efectivo",
      label: "Efectivo al retirar",
      description: "Reservás online y pagás en el mostrador cuando lo retirás.",
      isOnline: false,
      isActive: true,
      position: 1,
    },
  });

  // Sin API: el local genera el link de pago a mano desde la app Cuenta DNI
  // Comercios y lo manda por WhatsApp. Ver activeMethods() en checkout.
  await db.paymentMethod.upsert({
    where: { code: "cuenta-dni" },
    update: {},
    create: {
      code: "cuenta-dni",
      label: "Cuenta DNI (link de pago)",
      description: "Te mandamos el link de pago por WhatsApp para que pagues desde la app.",
      isOnline: false,
      isActive: true,
      position: 2,
    },
  });

  // ------------------------------------------------------- preguntas frecuentes
  // Se editan desde el admin después del primer deploy, así que el seed solo
  // carga estas si la tabla está vacía — nunca pisa lo que ya se cargó a mano.
  if ((await db.faq.count()) === 0) {
    const faqs = [
      {
        question: "¿Hacen envíos?",
        answer:
          "Sí: al finalizar la compra podés elegir envío a domicilio o retiro en el local. El costo y el medio de envío se coordinan por WhatsApp.",
        position: 0,
      },
      {
        question: "¿Cuánto tardan en preparar el pedido?",
        answer: "Normalmente el mismo día o el siguiente hábil. Te avisamos apenas está listo.",
        position: 1,
      },
      {
        question: "¿Cuánto tiempo me lo guardan?",
        answer:
          "Siete días desde que te avisamos. Si no podés en ese plazo, escribinos y lo dejamos apartado.",
        position: 2,
      },
      {
        question: "¿Qué medios de pago aceptan?",
        answer:
          "Mercado Pago, efectivo al retirar en el local, o Cuenta DNI (te mandamos el link de pago por WhatsApp).",
        position: 3,
      },
      {
        question: "¿Y si no encuentro lo que busco?",
        answer: "Tenemos bastante más de lo que está publicado. Consultanos y te decimos si lo tenemos.",
        position: 4,
      },
    ];
    await db.faq.createMany({ data: faqs });
  }

  // ------------------------------------------------------------- categorías
  const categorias = [
    {
      slug: "escolar",
      name: "Escolar",
      description:
        "Cuadernos, carpetas, mochilas y todo lo que la lista de útiles pide.",
      position: 0,
    },
    {
      slug: "comercial",
      name: "Comercial",
      description:
        "Libros contables, facturas, recibos y artículos de oficina.",
      position: 1,
    },
    {
      slug: "papelera",
      name: "Papelera",
      description: "Papelería, embalaje, bolsas y descartables.",
      position: 2,
    },
  ];

  // update: {} a propósito: el admin ya puede editar categorías desde
  // /admin/categorias, así que el seed no debe pisar esos cambios en cada
  // deploy — solo crea las que todavía no existen.
  const catBySlug: Record<string, string> = {};
  for (const c of categorias) {
    const saved = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, isActive: true },
    });
    catBySlug[c.slug] = saved.id;
  }

  // ----------------------------------------------------------------- marcas
  const exito = await db.brand.upsert({
    where: { slug: "exito" },
    update: {},
    create: { name: "Éxito", slug: "exito" },
  });
  const muresco = await db.brand.upsert({
    where: { slug: "muresco" },
    update: {},
    create: { name: "Muresco", slug: "muresco" },
  });

  // -------------------------------------------------------------- productos

  // 1. Cuaderno Éxito — con variantes de color reales.
  const cuaderno = await db.product.upsert({
    where: { slug: "cuaderno-exito-e3-abc-48-hojas-rayado" },
    update: {},
    create: {
      slug: "cuaderno-exito-e3-abc-48-hojas-rayado",
      name: "Cuaderno Éxito E3 tipo ABC x48 hojas rayado",
      summary: "Tapa dura forrada, 48 hojas rayadas. Seis colores para elegir.",
      description:
        "Cuaderno Éxito E3 tipo ABC de tapa dura forrada, con 48 hojas rayadas de papel de fibra de caña de azúcar.\n\nMedidas: 19 x 24 cm. Ideal para primaria y secundaria.\n\nDisponible en negro con lunares blancos, azul, rosa, amarillo, lila y verde oscuro.",
      categoryId: catBySlug["escolar"],
      brandId: exito.id,
      isActive: true,
      isFeatured: true,
      metaTitle: "Cuaderno Éxito E3 ABC 48 hojas rayado",
      metaDescription:
        "Cuaderno Éxito E3 tipo ABC, tapa dura forrada, 48 hojas rayadas. Seis colores. Retiralo en Villa Bosch, Tres de Febrero.",
      images: {
        create: [
          {
            url: img("1775206850-4fb9d8eaabc856c6d017860223166017"),
            alt: "Cuaderno Éxito E3 negro con lunares blancos, tapa dura",
            position: 0,
          },
          {
            url: img("1775206847-d93c535abf110c055a17860243017522"),
            alt: "Cuaderno Éxito E3 lila, tapa dura",
            position: 1,
          },
          {
            url: img("1775206839-1-883ec90d0e745cf6e017860245185307"),
            alt: "Cuaderno Éxito E3 amarillo, tapa dura",
            position: 2,
          },
          {
            url: img("1775206837-4a9cca2203115ebb9a17860245883727"),
            alt: "Cuaderno Éxito E3 rosa, tapa dura",
            position: 3,
          },
          {
            url: img("1775689263-7da75e7c9142bb330617860245990129"),
            alt: "Cuaderno Éxito E3 verde oscuro, tapa dura",
            position: 4,
          },
        ],
      },
      variants: {
        create: [
          { name: "Negro", priceCents: 1090000, stock: 12, position: 0 },
          { name: "Azul", priceCents: 1090000, stock: 8, position: 1 },
          { name: "Rosa", priceCents: 1090000, stock: 6, position: 2 },
          { name: "Amarillo", priceCents: 1090000, stock: 5, position: 3 },
          { name: "Lila", priceCents: 1090000, stock: 4, position: 4 },
          { name: "Verde oscuro", priceCents: 1090000, stock: 3, position: 5 },
        ],
      },
    },
  });

  // 2. Masa Playlife — producto sin variantes: una sola, llamada "Único".
  const masa = await db.product.upsert({
    where: { slug: "masa-ultra-liviana-playlife-15-colores" },
    update: {},
    create: {
      slug: "masa-ultra-liviana-playlife-15-colores",
      name: "Masa ultra liviana Playlife Muresco x15 colores",
      summary: "No tóxica, sin gluten ni lactosa. Apta desde los 3 años.",
      description:
        "Masa para modelar ultra liviana, flexible y ligera al tacto.\n\nNo es tóxica, no mancha y no contiene gluten ni lactosa: es apta para mayores de 3 años.\n\nIncluye 15 colores surtidos combinables entre sí, que se secan de forma natural al aire libre y rebotan como una pelota saltarina.",
      categoryId: catBySlug["escolar"],
      brandId: muresco.id,
      isActive: true,
      isFeatured: true,
      metaTitle: "Masa ultra liviana Playlife x15 colores",
      metaDescription:
        "Masa para modelar Playlife Muresco, 15 colores surtidos. No tóxica, sin gluten ni lactosa. Retiralo en Villa Bosch.",
      images: {
        create: [
          {
            url: img("masa-soft-x15colores-33b42289c3a20bf87517860205721924"),
            alt: "Paquete de masa ultra liviana Playlife con 15 colores surtidos",
            position: 0,
          },
        ],
      },
      variants: {
        create: [{ name: "Único", priceCents: 770000, stock: 10, position: 0 }],
      },
    },
  });

  console.log(`  categorías: ${categorias.length}`);
  console.log(`  productos:  ${[cuaderno, masa].length}`);
  console.log("Listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
