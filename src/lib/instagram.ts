// Posteos de Instagram que se muestran en la home.
//
// No se usa la API de Instagram: pide app de Meta, revisión y un token que hay
// que renovar cada 60 días. Para una librería que postea cada tanto es mucho
// más de lo necesario. Acá el local pega los links de los posteos que quiere
// mostrar en /admin/ajustes y se embeben con el widget oficial. Mismo enfoque
// que en ART Muebles.

export const INSTAGRAM_POST_LIMIT = 6;

// Acepta posteos, reels y videos. El código del posteo es lo único que varía.
const POST_URL =
  /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i;

/**
 * Convierte el texto del ajuste (un link por línea) en permalinks normalizados.
 * Descarta cualquier línea que no sea un link de posteo de Instagram: el campo
 * es libre y alguien puede pegar el perfil, un comentario o basura.
 */
export function parseInstagramPosts(raw: string | undefined | null): string[] {
  if (!raw) return [];

  const seen = new Set<string>();
  const posts: string[] = [];

  for (const line of raw.split("\n")) {
    const match = POST_URL.exec(line.trim());
    if (!match) continue;

    // "reels" es el alias que usa la app al compartir; el embed espera "reel".
    const kind = match[1].toLowerCase() === "reels" ? "reel" : match[1].toLowerCase();
    // Se reconstruye el link desde cero para no arrastrar parámetros de
    // seguimiento (?igsh=...) ni terminar poniendo en el HTML algo que vino
    // pegado tal cual.
    const url = `https://www.instagram.com/${kind}/${match[2]}/`;

    if (seen.has(url)) continue;
    seen.add(url);
    posts.push(url);

    if (posts.length === INSTAGRAM_POST_LIMIT) break;
  }

  return posts;
}

/** "https://instagram.com/fusionlibreria" -> "@fusionlibreria" */
export function instagramHandle(profileUrl: string | undefined): string | null {
  if (!profileUrl) return null;
  const match = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(profileUrl);
  return match ? `@${match[1]}` : null;
}
