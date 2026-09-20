import "server-only";
import { db } from "./db";
import { expireStaleOrders } from "./orders";

// Alertas del panel: cosas que el local debería mirar apenas entra. Se calculan
// en vivo desde la base, sin tabla propia — son siempre derivables del estado.

export type AlertLevel = "action" | "warn" | "info";

export type Alert = {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  href: string;
  count: number;
};

// Por debajo de esto una variante se considera "stock bajo".
export const LOW_STOCK = 3;

export async function getAlerts(): Promise<Alert[]> {
  // Antes de contar nada, se cancelan solos los pedidos sin pagar que ya
  // vencieron — así el resto de las alertas (y el conteo de la campanita) ya
  // reflejan el estado real.
  await expireStaleOrders();

  const [pagados, listos, agotados, bajos] = await Promise.all([
    db.order.count({ where: { status: "PAGADO" } }),
    db.order.count({ where: { status: "LISTO_PARA_RETIRAR" } }),
    db.productVariant.count({
      where: { isActive: true, stock: { lte: 0 }, product: { isActive: true } },
    }),
    db.productVariant.count({
      where: {
        isActive: true,
        stock: { gt: 0, lte: LOW_STOCK },
        product: { isActive: true },
      },
    }),
  ]);

  const alerts: Alert[] = [];

  if (pagados > 0) {
    alerts.push({
      id: "pagados",
      level: "action",
      title: `${pagados} ${pagados === 1 ? "venta pagada sin preparar" : "ventas pagadas sin preparar"}`,
      detail: "Prepará el pedido y avisale al cliente cuando esté listo.",
      href: "/admin/pedidos?estado=PAGADO",
      count: pagados,
    });
  }

  if (agotados > 0) {
    alerts.push({
      id: "agotados",
      level: "warn",
      title: `${agotados} ${agotados === 1 ? "variante agotada" : "variantes agotadas"}`,
      detail: "Están activas pero sin stock: no se pueden comprar.",
      href: "/admin/productos",
      count: agotados,
    });
  }

  if (bajos > 0) {
    alerts.push({
      id: "bajos",
      level: "warn",
      title: `${bajos} ${bajos === 1 ? "variante con stock bajo" : "variantes con stock bajo"}`,
      detail: `Quedan ${LOW_STOCK} unidades o menos. Reponé antes de que se agoten.`,
      href: "/admin/productos",
      count: bajos,
    });
  }

  if (listos > 0) {
    alerts.push({
      id: "listos",
      level: "info",
      title: `${listos} ${listos === 1 ? "pedido listo para retirar" : "pedidos listos para retirar"}`,
      detail: "Esperando que el cliente pase a buscarlo.",
      href: "/admin/pedidos?estado=LISTO_PARA_RETIRAR",
      count: listos,
    });
  }

  return alerts;
}

// Cuántas alertas piden acción (para el contador de la barra): las urgentes y
// las de stock, no las meramente informativas.
export function actionableCount(alerts: Alert[]): number {
  return alerts.filter((a) => a.level !== "info").length;
}
