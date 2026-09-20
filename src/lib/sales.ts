import "server-only";
import type { OrderStatus } from "@prisma/client";
import { db } from "./db";

// Estadísticas de ventas para el panel. Todo se deriva de Order/OrderItem en
// vivo, sin tablas propias — igual que alerts.ts.

// Una orden "cuenta como venta" desde que se confirmó el pago en adelante.
export const CONFIRMED_ORDER_STATUSES: OrderStatus[] = [
  "PAGADO",
  "EN_PREPARACION",
  "LISTO_PARA_RETIRAR",
  "ENTREGADO",
];

export type RangeDays = 7 | 30 | 90;

export type DayPoint = { date: string; totalCents: number; orderCount: number };
export type ProductRanking = { name: string; quantity: number; totalCents: number };
export type PaymentBreakdown = { label: string; totalCents: number; orderCount: number };

export type SalesDashboard = {
  days: RangeDays;
  totalCents: number;
  orderCount: number;
  avgTicketCents: number;
  itemsSold: number;
  // null cuando el período anterior no tuvo ventas: no hay base para comparar.
  totalDeltaPct: number | null;
  orderCountDeltaPct: number | null;
  byDay: DayPoint[];
  topProducts: ProductRanking[];
  byPaymentMethod: PaymentBreakdown[];
};

function startOf(days: number, end: Date): Date {
  const d = new Date(end);
  d.setDate(d.getDate() - days);
  return d;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getSalesDashboard(days: RangeDays): Promise<SalesDashboard> {
  const end = new Date();
  const start = startOf(days, end);
  const previousStart = startOf(days, start);

  const [orders, previousOrders] = await Promise.all([
    db.order.findMany({
      where: { status: { in: CONFIRMED_ORDER_STATUSES }, paidAt: { gte: start, lte: end } },
      select: {
        totalCents: true,
        paidAt: true,
        paymentMethod: { select: { label: true } },
        items: { select: { productName: true, quantity: true, lineTotalCents: true } },
      },
    }),
    db.order.findMany({
      where: { status: { in: CONFIRMED_ORDER_STATUSES }, paidAt: { gte: previousStart, lte: start } },
      select: { totalCents: true },
    }),
  ]);

  const totalCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const orderCount = orders.length;
  const avgTicketCents = orderCount > 0 ? Math.round(totalCents / orderCount) : 0;
  const itemsSold = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );

  const prevTotalCents = previousOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const prevOrderCount = previousOrders.length;
  const totalDeltaPct = prevTotalCents > 0 ? ((totalCents - prevTotalCents) / prevTotalCents) * 100 : null;
  const orderCountDeltaPct =
    prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount) * 100 : null;

  const byDayMap = new Map<string, DayPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - (days - 1 - i));
    const key = dayKey(d);
    byDayMap.set(key, { date: key, totalCents: 0, orderCount: 0 });
  }
  for (const o of orders) {
    const key = dayKey(o.paidAt ?? end);
    const bucket = byDayMap.get(key);
    if (bucket) {
      bucket.totalCents += o.totalCents;
      bucket.orderCount += 1;
    }
  }
  const byDay = [...byDayMap.values()];

  const productMap = new Map<string, ProductRanking>();
  for (const o of orders) {
    for (const item of o.items) {
      const entry = productMap.get(item.productName) ?? {
        name: item.productName,
        quantity: 0,
        totalCents: 0,
      };
      entry.quantity += item.quantity;
      entry.totalCents += item.lineTotalCents;
      productMap.set(item.productName, entry);
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 8);

  const paymentMap = new Map<string, PaymentBreakdown>();
  for (const o of orders) {
    const label = o.paymentMethod?.label ?? "Sin especificar";
    const entry = paymentMap.get(label) ?? { label, totalCents: 0, orderCount: 0 };
    entry.totalCents += o.totalCents;
    entry.orderCount += 1;
    paymentMap.set(label, entry);
  }
  const byPaymentMethod = [...paymentMap.values()].sort((a, b) => b.totalCents - a.totalCents);

  return {
    days,
    totalCents,
    orderCount,
    avgTicketCents,
    itemsSold,
    totalDeltaPct,
    orderCountDeltaPct,
    byDay,
    topProducts,
    byPaymentMethod,
  };
}
