import { getSettings } from "@/lib/settings";

/**
 * Barra flotante de redes, pegada al borde derecho de la pantalla.
 *
 * Solo aparecen las redes que tengan URL cargada en Ajustes: si el local deja
 * de usar TikTok, se borra el campo y el ícono desaparece, sin tocar código.
 *
 * En celular no se muestra: una barra fija a la derecha le come una franja a la
 * grilla de productos y queda encima de los botones de "Agregar al carrito".
 * Ahí las redes ya están en el footer.
 */
export async function SocialRail() {
  const settings = await getSettings();

  const redes = [
    { label: "Instagram", url: settings["instagram.url"], Icon: InstagramIcon },
    { label: "Facebook", url: settings["facebook.url"], Icon: FacebookIcon },
    { label: "TikTok", url: settings["tiktok.url"], Icon: TikTokIcon },
  ].filter((red) => red.url);

  if (redes.length === 0) return null;

  return (
    <nav
      aria-label="Redes sociales"
      className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 flex-col overflow-hidden rounded-l-xl border border-r-0 border-line bg-white shadow-md sm:flex"
    >
      {redes.map(({ label, url, Icon }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} de Librería Fusión`}
          title={label}
          className="flex h-11 w-11 items-center justify-center border-b border-line text-brand transition last:border-b-0 hover:bg-brand hover:text-white"
        >
          <Icon />
        </a>
      ))}
    </nav>
  );
}

// Íconos propios en vez de una librería: son tres, no cambian nunca, y heredan
// el color del link con currentColor.

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.5 21.9v-8.1h2.7l.4-3.1h-3.1V8.7c0-.9.25-1.5 1.55-1.5h1.65V4.4c-.29-.04-1.27-.13-2.41-.13-2.39 0-4.03 1.46-4.03 4.13v2.3H7.5v3.1h2.75v8.1h3.25z"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.18 0 .35.02.52.05v-3.1a5.69 5.69 0 0 0-.52-.03 5.66 5.66 0 1 0 5.66 5.66V9c1.2.86 2.65 1.33 4.15 1.33V7.24a4.28 4.28 0 0 1-3.07-1.42z"
      />
    </svg>
  );
}
