// El título de la tienda con los colores del isologo: la última palabra
// ("Fusión") con cada letra de un color, el resto en blanco.
//
// POR QUÉ SOBRE UN FONDO OSCURO: los colores del logo sobre el blanco del
// header son ilegibles como texto — el amarillo da 1.81:1 cuando WCAG AA pide
// 4.5:1, peor que el 1.53:1 que la auditoría marcó como lo más grave de la
// tienda anterior. Sobre el azul oscuro los mismos colores pasan holgados. Los
// números están en globals.css, junto a la paleta.
//
// POR QUÉ LA ÚLTIMA PALABRA Y NO "Fusión" ESCRITO ACÁ: el nombre sale de los
// ajustes y el local puede cambiarlo. Colorear la última palabra funciona para
// cualquier nombre de dos palabras, y con una sola palabra colorea esa.

const COLORES = [
  "text-logo-rosa",
  "text-logo-celeste",
  "text-logo-amarillo",
  "text-logo-verde",
] as const;

export function StoreWordmark({ name }: { name: string }) {
  const palabras = name.trim().split(/\s+/);
  const ultima = palabras.pop() ?? "";
  const resto = palabras.join(" ");

  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-lg bg-logo-fondo px-3 py-1.5 text-xl font-extrabold tracking-tight">
      {/* El nombre completo para quien usa lector de pantalla: partir una
          palabra en <span> por letra hace que algunos la deletreen. */}
      <span className="sr-only">{name}</span>

      <span aria-hidden="true" className="inline-flex items-baseline gap-1.5">
        {/* Verde agua: el mismo del fondo del isologo. El blanco competía
            con las letras de colores en vez de dejarlas brillar. */}
        {resto && <span className="text-logo-verde">{resto}</span>}
        <span>
          {[...ultima].map((letra, i) => (
            <span key={`${letra}-${i}`} className={COLORES[i % COLORES.length]}>
              {letra}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
