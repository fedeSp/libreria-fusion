"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type Slide = {
  id: string;
  imageUrl: string;
  alt: string;
  linkUrl: string | null;
};

const INTERVALO_MS = 6000;

/**
 * Carrusel de la portada.
 *
 * El texto de cada promo va adentro de la imagen, así que acá no se superpone
 * nada: la única responsabilidad es mostrarlas, dejar navegar y no molestar.
 *
 * Tres cosas que no son opcionales y por eso están aunque nadie las pida:
 *  - Se frena solo al pasar el mouse o al tabular adentro. Un carrusel que se
 *    mueve mientras alguien intenta tocar un botón es una trampa.
 *  - Respeta "reducir movimiento" del sistema operativo: ahí no avanza solo.
 *  - Con una sola imagen no hay flechas, ni puntos, ni giro: es un banner.
 */
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const inicioTactil = useRef<number | null>(null);

  const total = slides.length;
  const hayVarias = total > 1;

  const ir = useCallback((i: number) => setActual(((i % total) + total) % total), [total]);
  const siguiente = useCallback(() => ir(actual + 1), [actual, ir]);
  const anterior = useCallback(() => ir(actual - 1), [actual, ir]);

  useEffect(() => {
    if (!hayVarias || pausado) return;
    // El sistema operativo manda: si la persona pidió menos movimiento, el
    // carrusel se queda quieto y se navega a mano.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const t = setInterval(() => setActual((i) => (i + 1) % total), INTERVALO_MS);
    return () => clearInterval(t);
  }, [hayVarias, pausado, total]);

  function alSoltar(x: number) {
    if (inicioTactil.current === null) return;
    const recorrido = x - inicioTactil.current;
    inicioTactil.current = null;
    // 40px para no confundir un arrastre con un toque.
    if (Math.abs(recorrido) < 40) return;
    if (recorrido < 0) siguiente();
    else anterior();
  }

  return (
    <section
      aria-label="Novedades"
      aria-roledescription="carrusel"
      className="relative overflow-hidden bg-brand-softer"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onTouchStart={(e) => (inicioTactil.current = e.touches[0].clientX)}
      onTouchEnd={(e) => alSoltar(e.changedTouches[0].clientX)}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${actual * 100}%)` }}
      >
        {slides.map((s, i) => {
          const imagen = (
            <Image
              src={s.imageUrl}
              alt={s.alt}
              fill
              sizes="100vw"
              // La primera es lo primero que se ve: que no espere su turno.
              priority={i === 0}
              className="object-cover"
            />
          );

          return (
            <div
              key={s.id}
              className="relative aspect-[1200/450] w-full shrink-0"
              // Las que no se están viendo salen del recorrido del lector de
              // pantalla y del tabulador.
              aria-hidden={i !== actual}
              inert={i !== actual}
            >
              {s.linkUrl ? (
                <Link href={s.linkUrl} className="block h-full w-full">
                  {imagen}
                </Link>
              ) : (
                imagen
              )}
            </div>
          );
        })}
      </div>

      {hayVarias && (
        <>
          <Flecha lado="izquierda" onClick={anterior} />
          <Flecha lado="derecha" onClick={siguiente} />

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => ir(i)}
                aria-label={`Ir a la imagen ${i + 1} de ${total}`}
                aria-current={i === actual}
                className={`h-2.5 rounded-full transition-all ${
                  i === actual ? "w-6 bg-brand" : "w-2.5 bg-white/80 hover:bg-white"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Flecha({ lado, onClick }: { lado: "izquierda" | "derecha"; onClick: () => void }) {
  const esIzquierda = lado === "izquierda";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={esIzquierda ? "Imagen anterior" : "Imagen siguiente"}
      className={`absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/85 p-2 text-ink shadow-md transition hover:bg-white sm:flex ${
        esIzquierda ? "left-3" : "right-3"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          d={esIzquierda ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
