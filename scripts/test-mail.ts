// Prueba el envío de mails sin tener que hacer una compra de verdad.
//
//   cd /opt/libreria-fusion && set -a && . ./.env && set +a
//   docker compose -f docker-compose.prod.yml run --rm --no-deps \
//     -e SMTP_PASS="$SMTP_PASS" migrate \
//     node --import tsx --conditions=react-server \
//     scripts/test-mail.ts vos@mail.com 7
//
// Va con --conditions=react-server porque lib/email importa "server-only", que
// fuera de Next no se resuelve sin esa condición.
//
// Primero verifica que el servidor de correo acepte las credenciales —que es
// donde falla el 90% de las veces— y recién después manda. Usa el mismo aviso
// que recibe el local cuando entra una venta, sobre un pedido real de la base:
// así lo que se ve en el mail es exactamente lo que se va a ver en producción.

import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const [destino, numeroCrudo] = process.argv.slice(2);

if (!destino) {
  console.error("Falta el mail de destino: npx tsx scripts/test-mail.ts vos@mail.com [nroPedido]");
  process.exit(1);
}

// El aviso lee de acá a quién mandarle. Se define antes de importar el módulo
// de mails para no depender del orden en que se evalúa cada cosa.
process.env.ADMIN_NOTIFY_EMAIL = destino;

const db = new PrismaClient();

async function main() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || "fusionlibreriapapelera@gmail.com";
  const pass = process.env.SMTP_PASS || "";

  console.log(`servidor : ${host}:${port}`);
  console.log(`cuenta   : ${user}`);
  console.log(`clave    : ${pass ? `${pass.length} caracteres` : "(vacía)"}`);

  if (!pass) {
    console.error("\nNo hay SMTP_PASS. Sin eso no se manda nada.");
    process.exit(1);
  }
  if (pass.length !== 16) {
    console.warn(
      `\nAviso: las contraseñas de aplicación de Google son de 16 caracteres y esta tiene ${pass.length}.`,
    );
  }

  console.log("\nverificando credenciales…");
  const transporte = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    await transporte.verify();
    console.log("credenciales OK\n");
  } catch (e) {
    console.error("\nEl servidor de correo rechazó las credenciales:");
    console.error(`  ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  const pedido = numeroCrudo
    ? await db.order.findUnique({ where: { number: Number(numeroCrudo) }, include: { items: true } })
    : await db.order.findFirst({ orderBy: { number: "desc" }, include: { items: true } });

  if (!pedido) {
    console.error("No se encontró ningún pedido en la base.");
    process.exit(1);
  }

  console.log(`mandando el aviso del pedido #${pedido.number} a ${destino}…`);
  const { notifyAdminNewOrder } = await import("../src/lib/email");
  await notifyAdminNewOrder(pedido);
  console.log("enviado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
