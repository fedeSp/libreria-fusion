import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { AdminShell } from "@/components/admin-shell";
import { InstagramPostsField } from "@/components/instagram-posts-field";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes", robots: { index: false } };

// Campos editables de la tienda. La clave es la de StoreSetting; el label es lo
// que ve el admin.
const FIELDS: {
  key: string;
  label: string;
  area?: boolean;
  rows?: number;
  hint?: string;
  // Campos con editor propio en vez de un input suelto.
  kind?: "instagram";
}[] = [
  { key: "store.name", label: "Nombre de la tienda" },
  { key: "store.address", label: "Dirección del local" },
  { key: "store.hours", label: "Horarios de atención" },
  { key: "store.phone", label: "Teléfono (para mostrar)" },
  { key: "store.whatsapp", label: "WhatsApp (solo números, con código país)" },
  { key: "store.email", label: "Email" },
  {
    key: "store.provincia",
    label: "Provincia",
    hint: "Para que Google entienda dónde queda el local. No se muestra en la tienda.",
  },
  { key: "store.codigoPostal", label: "Código postal" },
  { key: "pickup.notice", label: "Aviso de retiro (título)", area: true },
  { key: "pickup.detail", label: "Aviso de retiro (detalle)", area: true },
  { key: "instagram.url", label: "URL de Instagram" },
  {
    key: "instagram.posts",
    label: "Posteos de Instagram para la home",
    kind: "instagram",
    hint:
      'Para copiar el link: abrí el posteo en Instagram, tocá los tres puntitos y elegí "Copiar enlace". Se muestran hasta 6 en la tienda. Si no agregás ninguno, la sección no aparece.',
  },
  { key: "facebook.url", label: "URL de Facebook" },
  { key: "tiktok.url", label: "URL de TikTok" },
];

async function saveSettings(formData: FormData) {
  "use server";
  await requireAdmin();
  for (const f of FIELDS) {
    const value = String(formData.get(f.key) ?? "").trim();
    await db.storeSetting.upsert({
      where: { key: f.key },
      update: { value },
      create: { key: f.key, value },
    });
  }
  // Los settings alimentan header, footer y avisos de toda la tienda.
  revalidatePath("/", "layout");
  revalidatePath("/admin/ajustes");
}

export default async function AjustesPage() {
  const admin = await requireAdmin();
  const settings = await getSettings();

  return (
    <AdminShell adminName={admin.name}>
      <h1 className="text-2xl font-extrabold text-ink">Ajustes de la tienda</h1>
      <p className="mt-1 text-sm text-muted">
        Estos textos se muestran en la tienda: header, footer, avisos de retiro y contacto.
      </p>

      <form action={saveSettings} className="mt-6 max-w-3xl space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="text-sm font-semibold text-ink">
              {f.label}
            </label>
            {f.hint && <p className="mt-0.5 text-xs text-muted">{f.hint}</p>}
            {f.kind === "instagram" ? (
              <InstagramPostsField name={f.key} defaultValue={settings[f.key] ?? ""} />
            ) : f.area ? (
              <textarea
                id={f.key}
                name={f.key}
                rows={f.rows ?? 2}
                defaultValue={settings[f.key] ?? ""}
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
              />
            ) : (
              <input
                id={f.key}
                name={f.key}
                defaultValue={settings[f.key] ?? ""}
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Guardar ajustes
        </button>
      </form>
    </AdminShell>
  );
}
