import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";

// Autenticación del panel de admin. Sesión = token firmado con HMAC guardado en
// una cookie httpOnly. Sin librerías de sesión: para un back office de una sola
// cuenta, un token firmado y verificado alcanza y sobra.

const COOKIE = "fusion_admin";
const MAX_AGE_S = 60 * 60 * 8; // 8 horas

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev_secret_cambiar_en_produccion";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

// token = base64url(json).firma
function makeToken(adminId: string): string {
  const body = JSON.stringify({ sub: adminId, exp: Date.now() + MAX_AGE_S * 1000 });
  const b = Buffer.from(body).toString("base64url");
  return `${b}.${sign(b)}`;
}

function verifyToken(token: string): string | null {
  const [b, sig] = token.split(".");
  if (!b || !sig) return null;
  // Comparación en tiempo constante para no filtrar la firma.
  const expected = sign(b);
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(b, "base64url").toString());
    if (typeof data.sub !== "string" || typeof data.exp !== "number") return null;
    if (Date.now() > data.exp) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function login(email: string, password: string): Promise<boolean> {
  const admin = await db.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!admin || !admin.isActive) return false;
  if (!(await bcrypt.compare(password, admin.passwordHash))) return false;

  (await cookies()).set(COOKIE, makeToken(admin.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });
  return true;
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

// Devuelve el admin logueado o null. No redirige.
export async function getAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const adminId = verifyToken(token);
  if (!adminId) return null;
  const admin = await db.adminUser.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) return null;
  return admin;
}

// Para páginas protegidas: si no hay sesión válida, manda al login.
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
