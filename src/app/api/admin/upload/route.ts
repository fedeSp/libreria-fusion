import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdmin } from "@/lib/auth";
import { UPLOADS_DIR, UPLOAD_EXT } from "@/lib/uploads";

// Subida de imágenes para productos. Guarda en UPLOADS_DIR (volumen persistente
// en producción) y devuelve la URL para servir el archivo, que la sirve
// src/app/uploads/[file]/route.ts — no el estático de Next, ver el porqué ahí.
// Requiere sesión de admin: no es un endpoint público.

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  if (!(await getAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }

  const ext = UPLOAD_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no permitido. Usá JPG, PNG, WEBP o GIF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen supera los 5 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, name), bytes);
  } catch (e) {
    console.error("upload: no se pudo escribir la imagen", e);
    return NextResponse.json(
      { error: "No se pudo guardar la imagen en el servidor." },
      { status: 500 },
    );
  }

  // La URL incluye el basePath (/libreria en prod) para que el <Image> la
  // resuelva contra el mismo origen. Vacío en local.
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return NextResponse.json({ url: `${base}/uploads/${name}` });
}
