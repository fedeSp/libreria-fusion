import { db } from "@/lib/db";
import { CheckoutForm } from "@/components/checkout-form";

// Se renderiza por request: los medios de pago activos salen de Postgres.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const paymentMethods = await db.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: { code: true, label: true, description: true, isOnline: true },
  });

  return <CheckoutForm paymentMethods={paymentMethods} />;
}
