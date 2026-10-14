/**
 * Letra y tamaño del texto al leer un EPUB (spec 13c, RF-BH2 – RF-BH3; T288). Uno para todos los libros,
 * recordado en el dispositivo como el tema del lector. En PDF es el acercamiento: la página crece y se lee por
 * pantallas, sin cambiar el número de páginas (T340). Sin React.
 *
 * Las letras incluidas (OFL) viajan con el motor de lectura (`public/reader/text.js`): Literata con
 * serifas, Atkinson Hyperlegible sin serifas, OpenDyslexic para dislexia y Patrick Hand manuscrita.
 * "Original" deja la del libro.
 */
export type LetraDeLectura = 'original' | 'serif' | 'sans' | 'dyslexic' | 'hand';
export const LETRAS_DE_LECTURA: readonly LetraDeLectura[] = ['original', 'serif', 'sans', 'dyslexic', 'hand'];

export const TAMANO_MIN = 70;
/** Hasta 300 % para quien batalla para ver (T340); en un PDF, 300 % es acercar la página tres veces. */
export const TAMANO_MAX = 300;
export const PASO_DE_TAMANO = 10;

export type PreferenciaDeTexto = { tamano: number; letra: LetraDeLectura };
export const TEXTO_POR_OMISION: PreferenciaDeTexto = { tamano: 100, letra: 'original' };

/** Un tamaño dentro del rango, en pasos de 10 %. */
export function tamanoValido(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return TEXTO_POR_OMISION.tamano;
  const redondo = Math.round(valor / PASO_DE_TAMANO) * PASO_DE_TAMANO;
  return Math.min(TAMANO_MAX, Math.max(TAMANO_MIN, redondo));
}

/** Lo guardado en el dispositivo, o el de omisión si no sirve. */
export function textoValido(valor: unknown): PreferenciaDeTexto {
  const v = valor as Partial<PreferenciaDeTexto> | null;
  const letra = LETRAS_DE_LECTURA.includes(v?.letra as LetraDeLectura) ? (v?.letra as LetraDeLectura) : TEXTO_POR_OMISION.letra;
  return { tamano: tamanoValido(v?.tamano), letra };
}

/** Un paso más grande o más chico, sin salirse del rango. */
export function otroTamano(actual: number, paso: 1 | -1): number {
  return tamanoValido(actual + paso * PASO_DE_TAMANO);
}
