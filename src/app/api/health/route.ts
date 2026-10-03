import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Lo consulta el monitor de uptime (.github/workflows/uptime.yml).
//
// Toca la base a propósito: que la app conteste no alcanza, porque con
// Postgres caído la tienda responde igual pero no puede mostrar un producto
// ni tomar un pedido. No devuelve detalles del error: es una URL pública.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[health] la base no responde:", err);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
