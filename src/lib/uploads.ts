import path from "node:path";

// Carpeta donde viven las fotos subidas desde el admin.
//
// Sigue siendo public/uploads (en prod es el volumen Docker `fusion_uploads`
// montado en /app/public/uploads), pero los archivos NO se sirven como estáticos
// de Next: ver src/app/uploads/[file]/route.ts y el comentario de ahí.
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

// Formatos aceptados: MIME que manda el navegador -> extensión en disco.
export const UPLOAD_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Y la vuelta, para responder con el Content-Type correcto al servirlas.
const CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// Los nombres los generamos nosotros (`<timestamp>-<hex>.<ext>`), así que un
// nombre que no matchee esto no es nuestro. El regex no deja pasar barras ni
// puntos dobles: corta cualquier intento de salir de la carpeta (../../.env).
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// Devuelve la ruta en disco de un archivo subido, o null si el nombre no es
// válido. Único lugar donde un nombre que viene de la URL se convierte en path.
export function resolveUploadPath(
  name: string,
): { filePath: string; contentType: string } | null {
  if (!name || name.length > 128 || !SAFE_NAME.test(name)) return null;

  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPE[ext];
  if (!contentType) return null;

  const filePath = path.join(UPLOADS_DIR, name);
  // Cinturón y tiradores: aunque el regex ya lo garantiza, verificamos que el
  // path resuelto siga adentro de la carpeta.
  if (path.relative(UPLOADS_DIR, filePath) !== name) return null;

  return { filePath, contentType };
}
