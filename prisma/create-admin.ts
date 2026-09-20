// Crea o actualiza el usuario admin del panel. NO se corre en el seed automático
// (para no hornear una contraseña por defecto en producción): se ejecuta a mano.
//
//   ADMIN_EMAIL=vos@mail.com ADMIN_PASSWORD='algo-seguro' ADMIN_NAME='Fede' \
//     docker compose exec web npx tsx prisma/create-admin.ts
//
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrador";

  if (!email || !password) {
    console.error("Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD en el entorno.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await db.adminUser.upsert({
    where: { email },
    update: { passwordHash, name, isActive: true },
    create: { email, passwordHash, name, isActive: true },
  });
  console.log(`Admin listo: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
