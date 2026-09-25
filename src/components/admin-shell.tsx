import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/lib/auth";
import { getAlerts, actionableCount } from "@/lib/alerts";
import { AdminNavDropdown } from "./admin-nav-dropdown";

async function logoutAction() {
  "use server";
  await logout();
  redirect("/admin/login");
}

// Links sueltos + grupos desplegables. Como grupo, "Catálogo" y "Configuración"
// evitan que la barra se desborde a medida que se suman secciones del admin.
const NAV_LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/ventas", label: "Ventas" },
];

const NAV_GROUPS = [
  {
    label: "Catálogo",
    items: [
      { href: "/admin/productos", label: "Productos" },
      { href: "/admin/categorias", label: "Categorías" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/portada", label: "Portada" },
      { href: "/admin/metodos-pago", label: "Medios de pago" },
      { href: "/admin/preguntas-frecuentes", label: "Preguntas frecuentes" },
      { href: "/admin/ajustes", label: "Ajustes" },
    ],
  },
];

// Envoltorio común de las páginas del panel: barra superior con navegación,
// nombre del admin logueado y salir. No gatea el acceso: eso lo hace
// requireAdmin() en cada página.
export async function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  // Contador de alertas para el ícono de la barra: se calcula una vez por carga
  // de página, en el envoltorio común, así aparece en todo el panel.
  const pending = actionableCount(await getAlerts());

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-extrabold text-brand">Fusión · Admin</span>
          <nav className="flex flex-wrap items-center gap-x-5 text-sm">
            {NAV_LINKS.map((n) => (
              <Link key={n.href} href={n.href} className="text-ink hover:text-brand">
                {n.label}
              </Link>
            ))}
            {NAV_GROUPS.map((g) => (
              <AdminNavDropdown key={g.label} label={g.label} items={g.items} />
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link
              href="/admin"
              className="relative text-ink hover:text-brand"
              aria-label={`Alertas${pending > 0 ? `: ${pending} pendientes` : ""}`}
              title="Alertas"
            >
              <span aria-hidden="true">🔔</span>
              {pending > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {pending}
                </span>
              )}
            </Link>
            <Link href="/" className="text-muted hover:text-brand" target="_blank">
              Ver tienda ↗
            </Link>
            <span className="text-muted">·</span>
            <span className="text-muted">{adminName}</span>
            <form action={logoutAction}>
              <button className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink hover:border-brand hover:text-brand">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
