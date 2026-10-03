// QR de Data Fiscal (ARCA, ex AFIP — RG 1907/2005, formulario 960/NM).
//
// ARCA entrega un fragmento de HTML para pegar en el sitio:
//
//   <a href="http://qr.afip.gob.ar/?qr=XXXX" target="_F960AFIPInfo">
//     <img src="http://www.afip.gob.ar/images/f960/DATAWEB.jpg" border="0"></a>
//
// Lo único propio de cada comercio es el link. La imagen es siempre la misma y
// vive copiada en public/data-fiscal.jpg: la de ARCA se sirve por http, y una
// tienda en https no puede cargarla sin que el navegador la bloquee.
//
// El campo de Ajustes acepta el link solo o el fragmento entero, que es lo que
// el contador probablemente mande: pedirle a alguien que pesque el href de
// adentro de un HTML es invitar al error.

// Solo links al servicio de QR de ARCA. Así el campo no puede usarse para
// colgar en el footer un link cualquiera con el sello oficial al lado.
const QR_URL = /https?:\/\/qr\.(?:afip|arca)\.gob\.ar\/\?[^\s"'<>]+/i;

/**
 * Devuelve el link de Data Fiscal, o "" si no hay uno válido.
 *
 * NO se pasa a https: qr.afip.gob.ar solo responde por http (probado el
 * 03/10/2026). Un link http desde una página https es navegación, no contenido
 * mixto, así que el navegador no lo bloquea.
 */
export function parseDataFiscalUrl(raw: string | undefined | null): string {
  if (!raw) return "";
  const match = QR_URL.exec(raw.replace(/&amp;/g, "&"));
  return match ? match[0] : "";
}
