"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export type FaqInput = {
  question: string;
  answer: string;
  position: number;
  isActive: boolean;
};

function validate(input: FaqInput): string | null {
  if (input.question.trim().length < 3) return "La pregunta es obligatoria.";
  if (input.answer.trim().length < 3) return "La respuesta es obligatoria.";
  return null;
}

export async function createFaq(
  input: FaqInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireAdmin();
  const error = validate(input);
  if (error) return { ok: false, error };

  const faq = await db.faq.create({
    data: {
      question: input.question.trim(),
      answer: input.answer.trim(),
      position: Number.isFinite(input.position) ? input.position : 0,
      isActive: input.isActive,
    },
  });

  revalidatePath("/admin/preguntas-frecuentes");
  revalidatePath("/preguntas-frecuentes");
  return { ok: true, id: faq.id };
}

export async function updateFaq(
  id: string,
  input: FaqInput,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const error = validate(input);
  if (error) return { ok: false, error };

  await db.faq.update({
    where: { id },
    data: {
      question: input.question.trim(),
      answer: input.answer.trim(),
      position: Number.isFinite(input.position) ? input.position : 0,
      isActive: input.isActive,
    },
  });

  revalidatePath("/admin/preguntas-frecuentes");
  revalidatePath(`/admin/preguntas-frecuentes/${id}`);
  revalidatePath("/preguntas-frecuentes");
  return { ok: true };
}

export async function toggleFaqActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.faq.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/preguntas-frecuentes");
  revalidatePath("/preguntas-frecuentes");
  return { ok: true };
}

export async function deleteFaq(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.faq.delete({ where: { id } });
  revalidatePath("/admin/preguntas-frecuentes");
  revalidatePath("/preguntas-frecuentes");
  return { ok: true };
}
