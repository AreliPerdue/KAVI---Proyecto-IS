/**
 * Letra y tamaño del texto de un EPUB (spec 13c, RF-BH2 – RF-BH3; T288).
 *
 * Las letras incluidas son OFL y viajan con el motor: en el teléfono, dentro de la página empaquetada
 * (`globalThis.KAVI_FONTS`, en base64); en la web, en `vendor/fonts/`. Se declaran con direcciones `data:`
 * porque cada capítulo de foliate es otro documento (un iframe `blob:`) y necesita su propio `@font-face`;
 * así funcionan igual con y sin red. En el libro real se declaran una vez en el documento del motor, que es
 * donde viven las hojas.
 *
 * "Original" deja la letra del libro. El tamaño es un porcentaje del de base (100 %).
 */

export const LETRAS = {
  original: null,
  serif: { familia: 'KAVI Serif', archivos: [['serif-400', 400], ['serif-700', 700]], respaldo: 'Georgia, "Times New Roman", serif' },
  sans: { familia: 'KAVI Sans', archivos: [['sans-400', 400], ['sans-700', 700]], respaldo: 'system-ui, -apple-system, Roboto, sans-serif' },
  dyslexic: { familia: 'KAVI Dislexia', archivos: [['dyslexic-400', 400], ['dyslexic-700', 700]], respaldo: 'sans-serif' },
  hand: { familia: 'KAVI Manuscrita', archivos: [['hand-400', 400]], respaldo: 'cursive' },
  // Solo para los textos del lienzo (T377): la letra del logo y la del eslogan de KAVI. El lector no las ofrece.
  brand: { familia: 'KAVI Marca', archivos: [['brand-400', 400]], respaldo: 'system-ui, sans-serif' },
  slogan: { familia: 'KAVI Eslogan', archivos: [['slogan-400', 400]], respaldo: 'system-ui, sans-serif' },
};

export const TAMANO_MIN = 70;
export const TAMANO_MAX = 300; // como `reader-text.ts` (T340)

export const letraValida = (valor) => (Object.prototype.hasOwnProperty.call(LETRAS, valor) ? valor : 'original');
export const tamanoValido = (valor) => (Number.isFinite(valor) ? Math.min(TAMANO_MAX, Math.max(TAMANO_MIN, Math.round(valor))) : 100);

const datos = new Map(); // nombre → data URL

/** La letra como dirección `data:`: de la página empaquetada o, en la web, del archivo junto al motor. */
async function datosDe(nombre, vendor) {
  if (datos.has(nombre)) return datos.get(nombre);
  let base64 = globalThis.KAVI_FONTS?.[nombre];
  if (!base64) {
    const respuesta = await fetch(`${vendor}fonts/${nombre}.woff2`);
    if (!respuesta.ok) throw new Error(`letra ${nombre}: HTTP ${respuesta.status}`);
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    let binario = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    base64 = btoa(binario);
  }
  const url = `data:font/woff2;base64,${base64}`;
  datos.set(nombre, url);
  return url;
}

/** Los `@font-face` de una letra (vacío con "Original"). */
export async function caraDeLetra(letra, vendor) {
  const l = LETRAS[letra];
  if (!l) return '';
  const caras = await Promise.all(
    l.archivos.map(async ([nombre, peso]) => `@font-face { font-family: "${l.familia}"; font-weight: ${peso}; font-style: normal; font-display: block; src: url(${await datosDe(nombre, vendor)}) format("woff2"); }`),
  );
  return caras.join('\n');
}

/** La pila de letras para CSS, o `null` con "Original". */
export function familiaDe(letra) {
  const l = LETRAS[letra];
  return l ? `"${l.familia}", ${l.respaldo}` : null;
}

/**
 * Lo que se le pone a cada capítulo de un EPUB: el tamaño en la raíz (lo que el libro mida en `em`, `rem` o
 * `%` crece con él) y la letra en todo el texto salvo el código.
 */
export function estilosDeTexto({ tamano, letra }, caras) {
  const familia = familiaDe(letra);
  return `${caras}
html { font-size: ${tamano}% !important; touch-action: pan-x pan-y; }
${familia ? `body, body *:not(code):not(pre):not(kbd):not(samp):not(svg *) { font-family: ${familia} !important; }` : ''}`;
}
