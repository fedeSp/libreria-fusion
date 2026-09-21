import { redirect } from "next/navigation";
import { getAdmin, login } from "@/lib/auth";
import { minutosRestantes } from "@/lib/login-throttle";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ingresar al panel", robots: { index: false } };

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await login(email, password);
  if (result.ok) redirect("/admin");

  // El tiempo de espera viaja en la URL porque el redirect pierde todo lo demás.
  if (result.motivo === "bloqueado") {
    redirect(`/admin/login?error=bloqueado&espera=${result.restanteMs}`);
  }
  redirect("/admin/login?error=1");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; espera?: string }>;
}) {
  // Si ya está logueado, directo al panel.
  if (await getAdmin()) redirect("/admin");
  const { error, espera } = await searchParams;
  const bloqueado = error === "bloqueado";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-extrabold text-ink">Panel de administración</h1>
      <p className="mt-1 text-sm text-muted">Librería Fusión</p>

      <form action={loginAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-semibold text-ink">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {bloqueado
              ? `Demasiados intentos fallidos. Probá de nuevo en ${minutosRestantes(Number(espera) || 0)}.`
              : "Email o contraseña incorrectos."}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
