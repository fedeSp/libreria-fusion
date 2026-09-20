import Link from "next/link";
import type { Alert } from "@/lib/alerts";

const TONE: Record<Alert["level"], string> = {
  action: "border-brand/30 bg-brand-softer",
  warn: "border-danger/30 bg-danger/5",
  info: "border-line bg-white",
};

const ICON: Record<Alert["level"], string> = {
  action: "🔔",
  warn: "⚠️",
  info: "ℹ️",
};

// Lista de alertas del panel. Si no hay ninguna, muestra un estado tranquilo.
export function AdminAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white p-5">
        <p className="text-sm text-muted">
          ✅ Todo al día. No hay nada pendiente por ahora.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {alerts.map((a) => (
        <li key={a.id}>
          <Link
            href={a.href}
            className={`flex items-start gap-3 rounded-xl border p-4 transition hover:shadow-md ${TONE[a.level]}`}
          >
            <span aria-hidden="true" className="text-lg">{ICON[a.level]}</span>
            <span className="flex-1">
              <span className="block font-semibold text-ink">{a.title}</span>
              <span className="block text-sm text-muted">{a.detail}</span>
            </span>
            <span aria-hidden="true" className="text-muted">→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
