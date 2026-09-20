"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/money";

type DayPoint = { date: string; totalCents: number; orderCount: number };

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function formatCompact(cents: number): string {
  return `$${new Intl.NumberFormat("es-AR").format(Math.round(cents / 100))}`;
}

// Barras de ventas por día. Es interactivo (hover/foco muestran el detalle)
// por eso vive en un componente cliente aparte de la página del panel.
export function SalesBarChart({ data }: { data: DayPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const max = Math.max(1, ...data.map((d) => d.totalCents));
  const maxIndex = data.reduce((best, d, i) => (d.totalCents > data[best].totalCents ? i : best), 0);
  const tickIndexes = [0, Math.floor((data.length - 1) / 2), data.length - 1];

  return (
    <div className="relative">
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: `${((hoverIndex + 0.5) / data.length) * 100}%` }}
        >
          <p className="font-semibold text-ink">{formatPrice(data[hoverIndex].totalCents)}</p>
          <p className="text-muted">
            {formatDayLabel(data[hoverIndex].date)} ·{" "}
            {data[hoverIndex].orderCount === 1
              ? "1 pedido"
              : `${data[hoverIndex].orderCount} pedidos`}
          </p>
        </div>
      )}

      <div className="flex h-40 items-end gap-0.5 border-b border-line">
        {data.map((d, i) => {
          const heightPct = d.totalCents > 0 ? Math.max(3, (d.totalCents / max) * 100) : 0;
          return (
            <div
              key={d.date}
              className="relative h-full flex-1"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(i)}
              onBlur={() => setHoverIndex(null)}
              tabIndex={0}
              role="img"
              aria-label={`${formatDayLabel(d.date)}: ${formatPrice(d.totalCents)}`}
            >
              {i === maxIndex && d.totalCents > 0 && (
                <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-ink">
                  {formatCompact(d.totalCents)}
                </span>
              )}
              <div
                className="absolute bottom-0 w-full rounded-t transition-colors"
                style={{
                  height: `${heightPct}%`,
                  minHeight: d.totalCents > 0 ? 2 : 1,
                  background:
                    d.totalCents === 0
                      ? "var(--color-line)"
                      : hoverIndex === i
                        ? "var(--color-brand-dark)"
                        : "var(--color-brand)",
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between text-[11px] text-muted">
        {tickIndexes.map((i, idx) => (
          <span key={idx}>{formatDayLabel(data[i].date)}</span>
        ))}
      </div>
    </div>
  );
}
