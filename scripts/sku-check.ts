// Comprueba que el formato de SKU no colisione.
//
// Existe porque la primera versión del esquema (tres letras del nombre + tres
// de la categoría + número de variante) colapsaba 96 variantes en 39 códigos
// sobre el catálogo real: en una librería el primer sustantivo se repite mucho
// y los productos parecidos caen en la misma categoría.
//
//   npm run test:sku

import { buildSku, nextProductNumber, productNumberFromSku, skuPrefix } from "../src/lib/sku";

let fallas = 0;
function check(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "ok  " : "FALLA"}  ${nombre}${ok ? "" : "  -> " + detalle}`);
  if (!ok) fallas++;
}

console.log("\n=== forma del codigo ===");
check("prefijo de nombre y categoria", skuPrefix("Lápices de colores FILGO", "Escolar") === "LAP-ESC");
check("saca acentos", skuPrefix("Éxito", "Papelería") === "EXI-PAP");
check("ignora simbolos y espacios", skuPrefix("  3M cinta", "Comercial") === "3MC-COM");
check("rellena si el nombre es corto", skuPrefix("Ok", "Escolar") === "OKX-ESC");
check("sin categoria usa GEN", skuPrefix("Cuaderno", null) === "CUA-GEN");
check("codigo completo", buildSku("LAP-ESC", 4, 0) === "LAP-ESC-04-001", buildSku("LAP-ESC", 4, 0));
check("la sexta variante es 006", buildSku("CUA-ESC", 11, 5) === "CUA-ESC-11-006", buildSku("CUA-ESC", 11, 5));

console.log("\n=== numero de producto ===");
check("el primero es 1", nextProductNumber("LAP-ESC", []) === 1);
check("toma el maximo mas uno", nextProductNumber("LAP-ESC", ["LAP-ESC-01-001", "LAP-ESC-03-001"]) === 4);
check("no reutiliza numeros de bajas", nextProductNumber("LAP-ESC", ["LAP-ESC-09-001"]) === 10);
check("ignora codigos de otro formato", nextProductNumber("LAP-ESC", ["CODIGO-PROVEEDOR-XYZ"]) === 1);
check("lee el numero de vuelta", productNumberFromSku("LAP-ESC-04-001", "LAP-ESC") === 4);
check("rechaza lo que no tiene la forma", productNumberFromSku("ABC123", "LAP-ESC") === null);

console.log("\n=== el caso que hundio al esquema anterior ===");
// Productos reales del catalogo que comparten las tres primeras letras Y la
// categoria. Con el esquema viejo los ocho daban LAP-ESC-001.
const catalogo = [
  { nombre: "Lapices de colores FILGO de 12 unidades", categoria: "Escolar", variantes: 1 },
  { nombre: "LAPICES DE COLORRES FILGO Linea Pinto FLUO DE 8 unidades", categoria: "Escolar", variantes: 1 },
  { nombre: "Lapices negros HB x 12", categoria: "Escolar", variantes: 1 },
  { nombre: "Repuestos hojas rayadas x 48 Triunfante", categoria: "Escolar", variantes: 1 },
  { nombre: "Repuesto EXITO n3 rayadas linea tradicional x 48", categoria: "Escolar", variantes: 1 },
  { nombre: "Cuaderno Éxito E3 tipo ABC x48 hojas rayado", categoria: "Escolar", variantes: 6 },
  { nombre: "Cuaderno  EXITO Nro 3  TAPAS DURAS 19x24", categoria: "Escolar", variantes: 5 },
  { nombre: "CINTA DE PAPEL 12 MM X 40 MTS", categoria: "Papelera", variantes: 1 },
  { nombre: "CINTA DE PAPEL 36MM X 40 MTS", categoria: "Papelera", variantes: 1 },
];

const emitidos: string[] = [];
const usadosPorPrefijo = new Map<string, string[]>();
for (const p of catalogo) {
  const prefix = skuPrefix(p.nombre, p.categoria);
  const usados = usadosPorPrefijo.get(prefix) ?? [];
  const numero = nextProductNumber(prefix, usados);
  for (let i = 0; i < p.variantes; i++) emitidos.push(buildSku(prefix, numero, i));
  usadosPorPrefijo.set(prefix, [...usados, buildSku(prefix, numero, 0)]);
}

check(
  `${emitidos.length} variantes -> ${new Set(emitidos).size} codigos distintos`,
  new Set(emitidos).size === emitidos.length,
  emitidos.filter((s, i) => emitidos.indexOf(s) !== i).join(", "),
);
check("los dos cuadernos no chocan", emitidos.includes("CUA-ESC-01-001") && emitidos.includes("CUA-ESC-02-001"));
check("el cuaderno de 6 colores llega a 006", emitidos.includes("CUA-ESC-01-006"));
check("las dos cintas se distinguen", emitidos.includes("CIN-PAP-01-001") && emitidos.includes("CIN-PAP-02-001"));

console.log(fallas === 0 ? "\nTODO OK\n" : `\n${fallas} FALLAS\n`);
process.exit(fallas === 0 ? 0 : 1);
