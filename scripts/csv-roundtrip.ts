// Comprueba que exportar e importar el catálogo sean la misma operación al
// revés: arma el CSV igual que la ruta de exportación, lo vuelve a leer con el
// importador y compara campo por campo.
//
// Correlo con: npm run test:csv
// Es una función pura, no necesita base ni servidor levantado.

import { toCsv, parseCsv, CSV_BOM } from "../src/lib/csv";
import { formatPriceForCsv, parsePriceToCents } from "../src/lib/money";
import {
  PRODUCT_COLUMNS,
  PRODUCT_CSV_HEADER,
  CATEGORY_COLUMNS,
  CATEGORY_CSV_HEADER,
  IMAGE_SEPARATOR,
  columnIndexes,
  formatFlag,
  rowFromValues,
} from "../src/lib/catalog-csv";
import { planProductImport } from "../src/lib/product-csv";
import { ORDER_COLUMNS, ORDER_CSV_HEADER } from "../src/lib/catalog-csv";
import { formatDateTimeAR, formatDateAR, dayKeyAR, startOfDayAR, endOfDayAR } from "../src/lib/dates";

let fallas = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "ok  " : "FALLA"}  ${nombre}${ok ? "" : "  -> " + detalle}`);
  if (!ok) fallas++;
}

// Catálogo de mentira con todo lo que suele romper un CSV: acentos, comas,
// comillas, punto y coma, saltos de línea, decimales y varias variantes.
const catalogo = [
  {
    slug: "cuaderno-exito-e3",
    name: 'Cuaderno Éxito E3 "ABC" x48',
    categorySlug: "cuadernos",
    brand: "Éxito",
    summary: "Tapa dura, forrada",
    description: "Rayado.\nTapa dura; forrada, con lunares.",
    isActive: true,
    isFeatured: true,
    metaTitle: "Cuaderno Éxito E3",
    metaDescription: "Comprá el cuaderno E3, tapa dura.",
    images: ["/uploads/a1.webp", "/uploads/b2.png"],
    variants: [
      { name: "Negro", sku: "CUA-NEG", priceCents: 1090000, compareAtPriceCents: 1290000, stock: 12, isActive: true },
      { name: "Rosa", sku: "CUA-ROS", priceCents: 1090050, compareAtPriceCents: null, stock: 8, isActive: true },
      { name: "Verde oscuro", sku: "", priceCents: 1090000, compareAtPriceCents: null, stock: 0, isActive: false },
    ],
  },
  {
    slug: "tabla-corte-a4",
    name: "Tabla para corte A4",
    categorySlug: "comercial",
    brand: "",
    summary: "",
    description: "",
    isActive: false,
    isFeatured: false,
    metaTitle: "",
    metaDescription: "",
    images: [],
    variants: [
      { name: "Único", sku: "TAB-A4", priceCents: 699900, compareAtPriceCents: null, stock: 5, isActive: true },
    ],
  },
];

// Exactamente lo que arma la ruta de exportación.
const filas: string[][] = [[...PRODUCT_CSV_HEADER]];
for (const p of catalogo) {
  p.variants.forEach((v, i) => {
    filas.push(
      rowFromValues(PRODUCT_COLUMNS, {
        slug: p.slug,
        name: p.name,
        categorySlug: p.categorySlug,
        brand: p.brand,
        summary: p.summary,
        description: p.description,
        isActive: formatFlag(p.isActive),
        isFeatured: formatFlag(p.isFeatured),
        variantName: v.name,
        sku: v.sku,
        price: formatPriceForCsv(v.priceCents),
        compareAtPrice: v.compareAtPriceCents != null ? formatPriceForCsv(v.compareAtPriceCents) : "",
        stock: String(v.stock),
        variantActive: formatFlag(v.isActive),
        images: i === 0 ? p.images.join(IMAGE_SEPARATOR) : "",
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
      }),
    );
  });
}

const archivo = CSV_BOM + toCsv(filas);

console.log("\n=== el exportador y el importador hablan del mismo archivo ===");
const idx = columnIndexes(parseCsv(archivo)[0], PRODUCT_COLUMNS);
const faltantes = Object.entries(idx).filter(([, v]) => v === -1).map(([k]) => k);
check("el importador reconoce las 17 columnas exportadas", faltantes.length === 0, faltantes.join(", "));
const idxCat = columnIndexes(parseCsv(CSV_BOM + toCsv([[...CATEGORY_CSV_HEADER]]))[0], CATEGORY_COLUMNS);
const faltCat = Object.entries(idxCat).filter(([, v]) => v === -1).map(([k]) => k);
check("idem para categorías", faltCat.length === 0, faltCat.join(", "));
check("el BOM no se pega a la primera columna", idx.slug === 0);

console.log("\n=== ida y vuelta de productos ===");
const plan = planProductImport(archivo);
check("sin errores de parseo", plan.errors.length === 0, JSON.stringify(plan.errors));
check("vuelven los 2 productos", plan.products.length === 2, String(plan.products.length));

for (const [i, esperado] of catalogo.entries()) {
  const leido = plan.products[i];
  if (!leido) { check(`producto ${i}`, false, "no volvió"); continue; }
  const p = `producto "${esperado.slug}"`;
  check(`${p}: nombre con comillas y acentos`, leido.name === esperado.name, leido.name);
  check(`${p}: descripción con coma y salto de línea`, leido.description === esperado.description, JSON.stringify(leido.description));
  check(`${p}: categoría`, leido.categorySlug === esperado.categorySlug, leido.categorySlug);
  check(`${p}: marca`, leido.brand === esperado.brand, leido.brand);
  check(`${p}: activo`, leido.isActive === esperado.isActive, String(leido.isActive));
  check(`${p}: destacado`, leido.isFeatured === esperado.isFeatured, String(leido.isFeatured));
  check(`${p}: meta title`, leido.metaTitle === esperado.metaTitle, leido.metaTitle);
  check(`${p}: fotos`, JSON.stringify(leido.images) === JSON.stringify(esperado.images), JSON.stringify(leido.images));
  check(`${p}: cantidad de variantes`, leido.variants.length === esperado.variants.length, String(leido.variants.length));

  esperado.variants.forEach((v, j) => {
    const lv = leido.variants[j];
    if (!lv) { check(`${p} / variante ${j}`, false, "no volvió"); return; }
    check(`${p} / ${v.name}: precio`, lv.priceCents === v.priceCents, `${lv.priceCents} != ${v.priceCents}`);
    check(`${p} / ${v.name}: precio anterior`, lv.compareAtPriceCents === v.compareAtPriceCents, String(lv.compareAtPriceCents));
    check(`${p} / ${v.name}: stock`, lv.stock === v.stock, String(lv.stock));
    check(`${p} / ${v.name}: sku`, lv.sku === v.sku, lv.sku);
    check(`${p} / ${v.name}: activa`, lv.isActive === v.isActive, String(lv.isActive));
  });
}

console.log("\n=== el precio no se multiplica por cien al dar la vuelta ===");
for (const cents of [1090000, 1090050, 99, 100, 0, 123456789]) {
  const texto = formatPriceForCsv(cents);
  check(`${cents} -> "${texto}" -> ${parsePriceToCents(texto)}`, parsePriceToCents(texto) === cents);
}

console.log("\n=== planilla llena a mano: producto una vez, variantes debajo ===");
const aMano = [
  ["nombre", "precio", "variante", "stock"],
  ["Resma A4", "8500", "Único", "20"],
  ["Marcadores", "3200", "Negro", "10"],
  ["", "3200", "Rojo", "7"],
  ["", "3500", "Azul", "4"],
];
const planMano = planProductImport(toCsv(aMano));
check("2 productos", planMano.products.length === 2, String(planMano.products.length));
check("el segundo junta sus 3 colores", planMano.products[1]?.variants.length === 3, String(planMano.products[1]?.variants.length));
check("sin errores", planMano.errors.length === 0, JSON.stringify(planMano.errors));

console.log("\n=== filas rotas: se avisan y no frenan al resto ===");
const conErrores = [
  ["nombre", "precio"],
  ["Producto bueno", "1000"],
  ["Producto sin precio", ""],
  ["Producto con precio invalido", "abc$%"],
];
const planErr = planProductImport(toCsv(conErrores));
check("el producto válido entra igual", planErr.products.length === 1, String(planErr.products.length));
check("se reportan las 2 filas malas", planErr.errors.length === 2, JSON.stringify(planErr.errors.map((e) => e.message)));

console.log("\n=== pedidos: las fechas salen en hora de Buenos Aires ===");
// 23/09/2026 23:30 UTC son las 20:30 del 23 en Argentina (UTC-3). Si el server
// formateara con su propia zona (Europa), diria las 01:30 del 24.
check(
  "23:30 UTC -> 20:30 del mismo dia",
  formatDateTimeAR(new Date("2026-09-23T23:30:00Z")) === "23/09/2026 20:30",
  formatDateTimeAR(new Date("2026-09-23T23:30:00Z")),
);
check(
  "02:00 UTC -> 23:00 del dia anterior",
  formatDateTimeAR(new Date("2026-09-24T02:00:00Z")) === "23/09/2026 23:00",
  formatDateTimeAR(new Date("2026-09-24T02:00:00Z")),
);
check("sin fecha queda vacio", formatDateTimeAR(null) === "");
// Lo mismo para la grilla y para el grafico: una venta de las 21:00 del 6 en
// Villa Bosch es del 6, aunque en UTC ya sea 7.
check(
  "la grilla muestra el dia argentino",
  formatDateAR(new Date("2026-09-07T00:30:00Z")) === "06/09/2026",
  formatDateAR(new Date("2026-09-07T00:30:00Z")),
);
check(
  "el grafico la agrupa en el mismo dia",
  dayKeyAR(new Date("2026-09-07T00:30:00Z")) === "2026-09-06",
  dayKeyAR(new Date("2026-09-07T00:30:00Z")),
);

console.log("\n=== pedidos: la fila no se corre respecto de la cabecera ===");
const filaPedido = rowFromValues(ORDER_COLUMNS, Object.fromEntries(
  ORDER_COLUMNS.map((c) => [c.key, `valor-${c.key}`]),
) as Record<(typeof ORDER_COLUMNS)[number]["key"], string>);
check("misma cantidad de celdas que de columnas", filaPedido.length === ORDER_CSV_HEADER.length, `${filaPedido.length} vs ${ORDER_CSV_HEADER.length}`);
check("cada celda cae bajo su columna", ORDER_COLUMNS.every((c, i) => filaPedido[i] === `valor-${c.key}`));

console.log("\n=== pedidos: el rango de fechas se lee en hora de Buenos Aires ===");
// Buenos Aires es UTC-3 todo el año, asi que el 1 a las 00:00 de aca son las
// 03:00 UTC del mismo dia. Si se leyera como UTC, un pedido de las 22:00 del 31
// de agosto entraria en el corte de septiembre.
check(
  "desde 01/09 arranca a las 03:00 UTC",
  startOfDayAR("2026-09-01")?.toISOString() === "2026-09-01T03:00:00.000Z",
  String(startOfDayAR("2026-09-01")?.toISOString()),
);
check(
  "hasta 30/09 termina a las 02:59:59.999 UTC del 1/10",
  endOfDayAR("2026-09-30")?.toISOString() === "2026-10-01T02:59:59.999Z",
  String(endOfDayAR("2026-09-30")?.toISOString()),
);
check("una venta de las 23:00 del 30 entra en septiembre",
  new Date("2026-10-01T02:00:00Z") <= endOfDayAR("2026-09-30")!);
check("una venta de las 00:30 del 1/10 ya no entra",
  new Date("2026-10-01T03:30:00Z") > endOfDayAR("2026-09-30")!);
check("fecha basura se ignora", startOfDayAR("ayer") === null && endOfDayAR("") === null);

console.log(fallas === 0 ? "\nTODO OK\n" : `\n${fallas} FALLAS\n`);
process.exit(fallas === 0 ? 0 : 1);
