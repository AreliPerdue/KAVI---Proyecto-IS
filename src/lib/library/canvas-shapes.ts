import type { FormaDeLienzo } from '@/lib/library/reader-protocol';

/**
 * Las formas del lienzo (13h, RF-CC14) como trazos en una caja de 100 × 100, para dibujarlas en la app (miniaturas,
 * T342). Son las mismas del motor (`public/reader/annotations.js` y `export.js`): si cambia una, cambian las tres.
 */
export const TRAZOS_DE_FORMA: Record<FormaDeLienzo, string> = {
  rect: 'M0 0H100V100H0Z',
  ellipse: 'M50 0A50 50 0 1 1 50 100A50 50 0 1 1 50 0Z',
  heart: 'M50 94C22 74 0 56 0 31 0 14 13 3 28 3c10 0 18 6 22 14C54 9 62 3 72 3c15 0 28 11 28 28 0 25-22 43-50 63z',
  star: 'M50 0L61.8 35.4H99L69 57.3 80.3 92.7 50 70.8 19.7 92.7 31 57.3 1 35.4H38.2Z',
  blob: 'M53 2c21 0 42 13 45 35 4 23-9 47-29 57-21 10-46 4-59-14C-3 62 0 36 12 20 22 7 37 2 53 2z',
};

/** El gris neutro con que empieza una forma (RF-CC11), igual que en el motor. */
export const FORMA_GRIS = '#BDBDBD';
/** La tinta de un texto sin color elegido, igual que en el motor. */
export const TINTA_DE_TEXTO = '#1A1A1A';
/** El papel de una página sin fondo: blanco, como el PDF en blanco del motor. */
export const PAPEL_DE_LIENZO = '#FFFFFF';
/** Polaroid y libro (T343), como en `public/reader/modules.js`. */
export const MARCO_POLAROID = '#FBFAF6';
export const SIN_FOTO = '#D6D6D6';
export const PELICULA = '#161616';
export const SIMBOLOS_DE_RATING = {
  stars: 'M50 4l13.6 29.4 32.2 3.7-23.9 21.9 6.5 31.8L50 74.8 21.6 90.8l6.5-31.8L4.2 37.1l32.2-3.7z',
  hearts: 'M50 90C22 70 4 54 4 32 4 17 16 6 30 6c9 0 16 5 20 12 4-7 11-12 20-12 14 0 26 11 26 26 0 22-18 38-46 58z',
} as const;

/**
 * Las caritas del módulo mood (13h, RF-CC14; T349b), dibujadas en 100 × 100 como en el motor (`modules.js`): la cara,
 * lo que va en trazo y lo que va relleno (ojos, corazones, lágrimas). El mismo dibujo en el motor y en la miniatura.
 */
const ojos = 'M31 40a4 4 0 1 0 8 0a4 4 0 1 0-8 0M61 40a4 4 0 1 0 8 0a4 4 0 1 0-8 0';
const corazon = (x: number, y: number) => `M${x} ${y + 6}c-6-4-9-7-9-10a4.5 4.5 0 0 1 9-2a4.5 4.5 0 0 1 9 2c0 3-3 6-9 10z`;
export const CARITAS: Record<'happy' | 'sad' | 'angry' | 'surprised' | 'inLove' | 'crying' | 'calm' | 'scared', { trazo: string; relleno: string }> = {
  happy: { trazo: 'M30 60Q50 80 70 60', relleno: ojos },
  sad: { trazo: 'M30 72Q50 56 70 72', relleno: ojos },
  angry: { trazo: 'M26 30L42 37M74 30L58 37M32 72Q50 62 68 72', relleno: 'M31 44a4 4 0 1 0 8 0a4 4 0 1 0-8 0M61 44a4 4 0 1 0 8 0a4 4 0 1 0-8 0' },
  surprised: { trazo: 'M41 68a9 9 0 1 0 18 0a9 9 0 1 0-18 0', relleno: ojos },
  inLove: { trazo: 'M30 60Q50 80 70 60', relleno: `${corazon(35, 34)}${corazon(65, 34)}` },
  crying: { trazo: 'M28 42Q35 36 42 42M58 42Q65 36 72 42M32 72Q50 58 68 72', relleno: 'M34 48q-4 9 0 11q4-2 0-11zM66 48q-4 9 0 11q4-2 0-11z' },
  calm: { trazo: 'M28 40Q35 46 42 40M58 40Q65 46 72 40M38 64Q50 71 62 64', relleno: '' },
  scared: { trazo: 'M29 40a6 6 0 1 0 12 0a6 6 0 1 0-12 0M59 40a6 6 0 1 0 12 0a6 6 0 1 0-12 0M30 70q5-6 10 0t10 0t10 0t10 0', relleno: '' },
};
/** La cara de un mood: el círculo. */
export const CARA = 'M50 4a46 46 0 1 0 0.01 0z';
