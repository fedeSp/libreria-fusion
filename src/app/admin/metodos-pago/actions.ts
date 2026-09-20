"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function togglePaymentMethodActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.paymentMethod.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/metodos-pago");
  revalidatePath("/checkout");
  return { ok: true };
}
