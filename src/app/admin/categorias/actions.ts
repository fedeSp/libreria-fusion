"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseCsv } from "@/lib/csv";

// "Escolar y oficina" -> "escolar-y-oficina"
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = base || "categoria";
  let slug = root;
  let n = 1;
  while (
    await db.category.findFirst({
      where: { slug, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
      select: { id: true },
    })
  ) {
    slug = `${root}-${++n}`;
  }
  return slug;
}

export type CategoryInput = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string;
  position: number;
  isActive: boolean;
};

export async function createCategory(
  input: CategoryInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireAdmin();

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "El nombre es obligatorio." };

  const slug = await uniqueSlug(slugify(input.slug.trim() || name));

  const category = await db.category.create({
    data: {
      name,
      slug,
      description: input.description.trim() || null,
      imageUrl: input.imageUrl.trim() || null,
      parentId: input.parentId || null,
      position: Number.isFinite(input.position) ? input.position : 0,
      isActive: input.isActive,
    },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true, id: category.id };
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "El nombre es obligatorio." };

  if (input.parentId === id) {
    return { ok: false, error: "Una categoría no puede ser su propia categoría padre." };
  }

  const slug = await uniqueSlug(slugify(input.slug.trim() || name), id);

  await db.category.update({
    where: { id },
    data: {
      name,
      slug,
      description: input.description.trim() || null,
      imageUrl: input.imageUrl.trim() || null,
      parentId: input.parentId || null,
      position: Number.isFinite(input.position) ? input.position : 0,
      isActive: input.isActive,
    },
  });

  revalidatePath("/admin/categorias");
  revalidatePath(`/admin/categorias/${id}`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  await requireAdmin();
  await db.category.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

// Baja de categoría. Si tiene productos o subcategorías, se pierde la
// referencia (quedan sin categoría) al borrar — mejor desactivarla.
export async function deleteCategory(
  id: string,
): Promise<{ ok: boolean; error?: string; deactivated?: boolean }> {
  await requireAdmin();

  const [products, children] = await Promise.all([
    db.product.count({ where: { categoryId: id } }),
    db.category.count({ where: { parentId: id } }),
  ]);

  if (products > 0 || children > 0) {
    await db.category.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/admin/categorias");
    revalidatePath("/", "layout");
    return { ok: true, deactivated: true };
  }

  await db.category.delete({ where: { id } });
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ------------------------------------------------------------- importar CSV

// Nombres de columna aceptados, en español (para la plantilla) e inglés (por
// si el archivo viene de otro lado). El orden de las columnas no importa.
const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nombre", "name"],
  slug: ["slug"],
  parentSlug: ["categoria_padre", "categoria padre", "parent", "parent_slug"],
  description: ["descripcion", "descripción", "description"],
  position: ["orden", "position"],
  isActive: ["activa", "active", "isactive"],
};

function findColumn(header: string[], aliases: string[]): number {
  return header.findIndex((h) => aliases.includes(h.trim().toLowerCase()));
}

// Todo lo que no diga explícitamente "no" se toma como activa: en una planilla
// llenada a mano es más común dejar la celda vacía que escribir "sí".
function parseActiveFlag(value: string): boolean {
  const v = value.trim().toLowerCase();
  return !["no", "0", "false", "inactiva", "inactivo"].includes(v);
}

export type CategoryCsvRow = {
  line: number;
  name: string;
  slug: string;
  parentSlug: string;
  description: string;
  position: number;
  isActive: boolean;
};

export type CategoryCsvPlan = {
  rows: CategoryCsvRow[];
  errors: { line: number; message: string }[];
};

function planCategoryImport(csvText: string): CategoryCsvPlan {
  const table = parseCsv(csvText);
  if (table.length === 0) {
    return { rows: [], errors: [{ line: 0, message: "El archivo está vacío." }] };
  }

  const header = table[0];
  const col = {
    name: findColumn(header, HEADER_ALIASES.name),
    slug: findColumn(header, HEADER_ALIASES.slug),
    parentSlug: findColumn(header, HEADER_ALIASES.parentSlug),
    description: findColumn(header, HEADER_ALIASES.description),
    position: findColumn(header, HEADER_ALIASES.position),
    isActive: findColumn(header, HEADER_ALIASES.isActive),
  };

  if (col.name === -1) {
    return { rows: [], errors: [{ line: 1, message: 'No se encontró la columna "nombre".' }] };
  }

  const rows: CategoryCsvRow[] = [];
  const errors: { line: number; message: string }[] = [];

  for (let i = 1; i < table.length; i++) {
    const raw = table[i];
    const line = i + 1;
    const name = raw[col.name]?.trim() ?? "";
    if (!name) {
      errors.push({ line, message: "Falta el nombre." });
      continue;
    }
    const positionRaw = col.position !== -1 ? (raw[col.position]?.trim() ?? "") : "";
    const position = positionRaw ? parseInt(positionRaw, 10) : 0;

    rows.push({
      line,
      name,
      slug: col.slug !== -1 ? slugify(raw[col.slug]?.trim() ?? "") : "",
      parentSlug: col.parentSlug !== -1 ? slugify(raw[col.parentSlug]?.trim() ?? "") : "",
      description: col.description !== -1 ? (raw[col.description]?.trim() ?? "") : "",
      position: Number.isFinite(position) ? position : 0,
      isActive: col.isActive !== -1 ? parseActiveFlag(raw[col.isActive] ?? "") : true,
    });
  }

  return { rows, errors };
}

// Vista previa: parsea y valida sin escribir nada, para que el admin vea qué
// va a pasar antes de confirmar.
export async function previewCategoryImport(csvText: string): Promise<CategoryCsvPlan> {
  await requireAdmin();
  return planCategoryImport(csvText);
}

export type CategoryImportResult = {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  warnings?: string[];
};

export async function confirmCategoryImport(csvText: string): Promise<CategoryImportResult> {
  await requireAdmin();
  const plan = planCategoryImport(csvText);
  if (plan.rows.length === 0) {
    return { ok: false, error: plan.errors[0]?.message ?? "No hay filas válidas para importar." };
  }

  let created = 0;
  let updated = 0;
  // Fila -> {slug final, id}. El slug final se resuelve acá (puede venir del
  // CSV o generarse del nombre), y se necesita en la segunda pasada para
  // enlazar categorías padre que estén en el mismo archivo.
  const resolved: { row: CategoryCsvRow; slug: string; id: string }[] = [];

  for (const row of plan.rows) {
    let slug: string;
    let existingId: string | null = null;

    if (row.slug) {
      slug = row.slug;
      const existing = await db.category.findUnique({ where: { slug }, select: { id: true } });
      existingId = existing?.id ?? null;
    } else {
      slug = await uniqueSlug(slugify(row.name));
    }

    const data = {
      name: row.name,
      description: row.description || null,
      position: row.position,
      isActive: row.isActive,
    };

    if (existingId) {
      await db.category.update({ where: { id: existingId }, data });
      resolved.push({ row, slug, id: existingId });
      updated++;
    } else {
      const c = await db.category.create({ data: { ...data, slug } });
      resolved.push({ row, slug, id: c.id });
      created++;
    }
  }

  // Segunda pasada: recién acá se enlazan los padres, ya con todas las filas
  // creadas — así una fila puede referenciar a otra del mismo archivo.
  const warnings: string[] = [];
  for (const { row, id } of resolved) {
    if (!row.parentSlug) continue;
    if (row.parentSlug === row.slug) {
      warnings.push(`Fila ${row.line}: "${row.name}" no puede ser su propia categoría padre.`);
      continue;
    }
    const inBatch = resolved.find((r) => r.slug === row.parentSlug);
    const parentId =
      inBatch?.id ??
      (await db.category.findUnique({ where: { slug: row.parentSlug }, select: { id: true } }))?.id;

    if (!parentId) {
      warnings.push(
        `Fila ${row.line}: no se encontró la categoría padre "${row.parentSlug}".`,
      );
      continue;
    }
    await db.category.update({ where: { id }, data: { parentId } });
  }

  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true, created, updated, warnings };
}
