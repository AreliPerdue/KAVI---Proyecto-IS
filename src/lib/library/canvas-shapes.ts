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
