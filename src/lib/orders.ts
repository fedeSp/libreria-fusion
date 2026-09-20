import "server-only";
import { db } from "./db";

// Vencimiento de pedidos sin pagar. No hay cron en esta app — todo se
// renderiza por request — así que en vez de un worker en segundo plano, cada
// página que lista o muestra pedidos llama a esto primero. Es barato (un solo
// UPDATE indexado) e idempotente: si ya no queda ningún pedido vencido, no
// actualiza nada.
export async function expireStaleOrders(): Promise<number> {
  const result = await db.order.updateMany({
    where: { status: "PENDIENTE_PAGO", expiresAt: { lt: new Date() } },
    data: { status: "CANCELADO" },
  });
  return result.count;
}
