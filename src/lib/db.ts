import { PrismaClient } from "@prisma/client";

// En dev, Next recarga los módulos en cada cambio. Sin este singleton
// se abre una conexión nueva por recarga y Postgres termina saturado.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
