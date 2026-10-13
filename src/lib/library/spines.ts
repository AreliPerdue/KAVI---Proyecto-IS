import { huella } from '@/lib/library/shelf';

/**
 * El librero (spec 13a, RF-BL2; T282): los libros de lomo, parados sobre repisas. Aquí, sin React, cuánto
 * mide cada lomo y cómo se reparten en repisas según el ancho.
 */

/** Grosor de un lomo: el de un libro sin páginas conocidas (EPUB), y los topes para que se pueda tocar. */
export const LOMO_SIN_PAGINAS = 40;
export const LOMO_MIN = 32;
export const LOMO_MAX = 72;

/** Alto de los lomos: varían un poco, como en un librero de verdad. */
export const LOMO_ALTO_MIN = 156;
export const LOMO_ALTO_MAX = 196;

/** Lo más alto que puede ser un lomo con imagen: más, y ya no parece libro junto a los demás. */
export const LOMO_ALTO_IMAGEN_MAX = 260;

/**
 * El alto de un lomo con imagen (RF-BL20): el que pide la imagen a ese grosor, para que se vea completa
 * y no recortada. Entre el mínimo de los lomos y `LOMO_ALTO_IMAGEN_MAX`; si la imagen pide más o menos,
 * se queda en el tope y la imagen se ve entera dentro (con el color del lomo en lo que sobre).
 */
export function altoConImagen(grosor: number, anchoImagen: number, altoImagen: number): { alto: number; ajustada: boolean } {
  if (anchoImagen <= 0 || altoImagen <= 0) return { alto: LOMO_ALTO_MIN, ajustada: false };
  const pedido = Math.round((grosor * altoImagen) / anchoImagen);
  const alto = Math.min(LOMO_ALTO_IMAGEN_MAX, Math.max(LOMO_ALTO_MIN, pedido));
  return { alto, ajustada: alto === pedido };
}

/** Separación entre lomos de una repisa. */
export const ENTRE_LOMOS = 3;

/**
 * Más páginas, más grueso: 100 páginas ≈ 36 px, 300 ≈ 48 px, 600 o más llegan al tope. Sin páginas
 * conocidas, uno de grosor medio.
 */
export function grosorDeLomo(paginas: number | null | undefined): number {
  if (!paginas || paginas <= 0) return LOMO_SIN_PAGINAS;
  return Math.round(Math.min(LOMO_MAX, Math.max(LOMO_MIN, 30 + paginas * 0.06)));
}

/** El alto de un lomo sale de su id: el mismo libro mide lo mismo siempre y en todos los dispositivos. */
export function altoDeLomo(id: string): number {
  return LOMO_ALTO_MIN + (huella(id) % (LOMO_ALTO_MAX - LOMO_ALTO_MIN + 1));
}

/**
 * Repartir en repisas, en orden, llenando cada una hasta donde quepa. Lo que es más ancho que la repisa
 * va solo en la suya (nunca se queda fuera).
 */
export function repartirEnRepisas<T>(cosas: readonly T[], anchoDe: (t: T) => number, anchoRepisa: number, separacion = ENTRE_LOMOS): T[][] {
  const repisas: T[][] = [];
  let actual: T[] = [];
  let usado = 0;
  for (const cosa of cosas) {
    const ancho = anchoDe(cosa);
    const conEste = actual.length === 0 ? ancho : usado + separacion + ancho;
    if (actual.length > 0 && conEste > anchoRepisa) {
      repisas.push(actual);
      actual = [cosa];
      usado = ancho;
    } else {
      actual.push(cosa);
      usado = conEste;
    }
  }
  if (actual.length > 0) repisas.push(actual);
  return repisas;
}

/** Cuántos lomos de una saga se ven juntos en el librero; los demás se cuentan ("+3"). */
export const LOMOS_DE_SAGA = 5;

/** El ancho del "+3" que cuenta los lomos de una saga que no se ven. */
export const ANCHO_RESTO = 24;

/** El ancho de una saga en el librero: sus primeros lomos, pegados como una colección, y el "+n" si son más. */
export function anchoDeSaga(paginas: readonly (number | null | undefined)[]): number {
  const lomos = paginas.slice(0, LOMOS_DE_SAGA).reduce<number>((suma, p) => suma + grosorDeLomo(p), 0);
  return paginas.length > LOMOS_DE_SAGA ? lomos + ANCHO_RESTO : lomos;
}
