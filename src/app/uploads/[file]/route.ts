import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolveUploadPath } from "@/lib/uploads";

// Sirve las fotos subidas desde el admin.
//
// POR QUÉ ESTE ARCHIVO EXISTE: en producción Next lista el contenido de
// `public/` UNA SOLA VEZ, al arrancar el server, y guarda esa lista en memoria
// (next/dist/server/lib/router-utils/filesystem.js). Todo lo que aparezca en
// public/ DESPUÉS del arranque no está en esa lista y devuelve 404 hasta el
// próximo reinicio. En `next dev` no pasa: ahí chequea el filesystem en cada
// request, por eso subir fotos funcionaba en local y se rompía en el server.
//
// Esta ruta lee el archivo del disco en el momento, así una foto recién subida
// se ve al instante. Las que ya estaban al arrancar las sigue sirviendo Next
// como estáticas (matchea antes) — mismo archivo, mismo resultado.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const resolved = resolveUploadPath(decodeURIComponent(file));
  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(resolved.filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": resolved.contentType,
      "Content-Length": String(bytes.byteLength),
      // El nombre incluye timestamp + random y nunca se reescribe: el archivo
      // es inmutable, se puede cachear para siempre.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
