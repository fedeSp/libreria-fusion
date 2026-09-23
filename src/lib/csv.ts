// Parser CSV mínimo (RFC4180: comillas, comas y saltos de línea dentro de un
// campo entre comillas). No se suma una librería para esto — es un algoritmo
// chico y estable, y evita una dependencia para una sola función.
export function parseCsv(input: string): string[][] {
  // Excel escribe un BOM al guardar como CSV UTF-8, y nosotros también lo
  // ponemos al exportar para que abra bien los acentos. Si no se saca acá, se
  // pega al nombre de la primera columna y esa columna deja de reconocerse:
  // un archivo exportado por la propia tienda no se podría volver a importar.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

// Un campo se entrecomilla solo si lo necesita: si lleva coma, comillas, salto
// de línea, o espacios en los bordes (que algunos lectores se comen).
function quoteField(value: string): string {
  if (/[",\r\n]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Arma un CSV a partir de filas de texto. Es la contraparte exacta de
 * parseCsv: lo que sale de acá se vuelve a leer sin pérdida, que es lo que
 * hace que exportar e importar sean la misma operación en los dos sentidos.
 *
 * Las líneas terminan en CRLF porque es lo que dice RFC4180 y lo que espera
 * Excel.
 */
export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(quoteField).join(",")).join("\r\n");
}

/** Excel no asume UTF-8 salvo que el archivo arranque con esto. */
export const CSV_BOM = "﻿";
