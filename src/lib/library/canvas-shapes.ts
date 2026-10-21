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
