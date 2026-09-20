"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

/**
 * Le pide al widget que convierta en posteos los <blockquote> que haya en la
 * página. Reintenta un rato porque embed.js carga async: puede no estar listo
 * todavía cuando se agrega un posteo nuevo desde el admin.
 */
export function processInstagramEmbeds(attempt = 0) {
  if (window.instgrm?.Embeds) {
    window.instgrm.Embeds.process();
  } else if (attempt < 10) {
    setTimeout(() => processInstagramEmbeds(attempt + 1), 300);
  }
}

/**
 * Carga el widget oficial de Instagram y le pide que convierta los
 * <blockquote> en posteos embebidos.
 *
 * embed.js solo procesa solo los blockquotes que ya estaban en la página
 * cuando él se cargó. Como acá los pinta el servidor y el script llega
 * después, hay que llamar a process() a mano: en onLoad la primera vez, y en
 * el efecto para cuando el script ya estaba cacheado de otra página.
 */
export function InstagramEmbedScript() {
  useEffect(() => {
    processInstagramEmbeds();
  }, []);

  return (
    <Script
      src="https://www.instagram.com/embed.js"
      // La home no depende de esto para ser útil: que cargue al final.
      strategy="lazyOnload"
      onLoad={() => processInstagramEmbeds()}
    />
  );
}
