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
/** Con "todos iguales", el alto de todos: el más alto de los variados, así la repisa no cambia de tamaño. */
export const LOMO_ALTO_IGUAL = LOMO_ALTO_MAX;
/** Lo más ancho que puede ser un lomo con imagen (una imagen de un libro muy grueso). */
export const LOMO_MAX_IMAGEN = 96;

/**
 * Cómo se reparte el alto en el librero (RF-BL2b): variado, como un librero de verdad, o todos iguales. En
 * los dos, los libros de una misma saga miden lo mismo, como una colección.
 */
export type AltoDeLomos = 'varied' | 'equal';
export const ALTO_DE_LOMOS_POR_OMISION: AltoDeLomos = 'varied';

export function altoDeLomosValido(valor: unknown): AltoDeLomos {
  return valor === 'equal' || valor === 'varied' ? valor : ALTO_DE_LOMOS_POR_OMISION;
}

/**
 * El alto de un lomo. Variado sale de la saga (si tiene) o del libro: siempre el mismo para cada uno y en
 * todos los dispositivos, y el mismo para todos los tomos de una saga.
 */
export function altoDeLomo(pieza: { id: string; series_id?: string | null }, modo: AltoDeLomos = ALTO_DE_LOMOS_POR_OMISION): number {
  if (modo === 'equal') return LOMO_ALTO_IGUAL;
  return LOMO_ALTO_MIN + (huella(pieza.series_id ?? pieza.id) % (LOMO_ALTO_MAX - LOMO_ALTO_MIN + 1));
}

/**
 * El ancho de un lomo (RF-BL2, RF-BL20). Sin imagen, sale de las páginas. Con imagen, el que pide la imagen
 * a ese alto (`proporcion` = ancho / alto de la imagen), así se ve completa y sin recortar; si pide menos que
 * el mínimo o más que el tope, se queda ahí y la imagen se ve entera dentro (`ajustada` es falso).
 */
export function anchoDeLomo(paginas: number | null | undefined, alto: number, proporcion?: number | null): { ancho: number; ajustada: boolean } {
  if (!proporcion || !Number.isFinite(proporcion) || proporcion <= 0) return { ancho: grosorDeLomo(paginas), ajustada: false };
  const pedido = Math.round(alto * proporcion);
  const ancho = Math.min(LOMO_MAX_IMAGEN, Math.max(LOMO_MIN, pedido));
  return { ancho, ajustada: ancho === pedido };
}

/**
 * Cuánto mide el lomo de una pieza en el librero: su alto (por el modo y su saga) y su ancho (por su imagen
 * de lomo, si ya se conoce su proporción, o por sus páginas). `proporciones` va por ruta de la imagen.
 */
export function medidaDeLomo(
  pieza: { id: string; series_id?: string | null; page_count?: number | null; spine_path?: string | null },
  modo: AltoDeLomos,
  proporciones: Readonly<Record<string, number>>,
): { alto: number; ancho: number; ajustada: boolean } {
  const alto = altoDeLomo(pieza, modo);
  const proporcion = pieza.spine_path ? proporciones[pieza.spine_path] : undefined;
  return { alto, ...anchoDeLomo(pieza.page_count, alto, proporcion) };
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
export function anchoDeSaga(anchos: readonly number[]): number {
  const lomos = anchos.slice(0, LOMOS_DE_SAGA).reduce<number>((suma, a) => suma + a, 0);
  return anchos.length > LOMOS_DE_SAGA ? lomos + ANCHO_RESTO : lomos;
}

/** Dónde quedó cada lomo al pintarse: su repisa y su orilla y ancho dentro de ella. */
export type LomoMedido = { fila: number; x: number; w: number };
/** Dónde quedó cada repisa: su altura y su alto, dentro del librero. */
export type RepisaMedida = { y: number; h: number };

/**
 * A dónde va un lomo arrastrado en el librero (RF-BL7b, T331), con la regla de `acomodar`: el lugar en la
 * lista sin él. La repisa es la que tiene el punto donde se soltó (o la más cercana); dentro de ella, antes del
 * primer lomo cuyo centro quede a la derecha del punto.
 */
export function destinoEnRepisas(opciones: {
  desde: number;
  /** El centro del lomo al soltarlo, en px del librero. */
  punto: { x: number; y: number };
  lomos: readonly (LomoMedido | undefined)[];
  repisas: readonly (RepisaMedida | undefined)[];
}): number {
  const { desde, punto, lomos, repisas } = opciones;
  const medidas = repisas.map((r, i) => ({ i, r })).filter((x): x is { i: number; r: RepisaMedida } => !!x.r);
  if (!medidas.length || !lomos[desde]) return desde;
  const dentro = medidas.find(({ r }) => punto.y >= r.y && punto.y <= r.y + r.h);
  const fila = (dentro ?? medidas.reduce((a, b) => (Math.abs(b.r.y + b.r.h / 2 - punto.y) < Math.abs(a.r.y + a.r.h / 2 - punto.y) ? b : a))).i;
  let antes = 0;
  lomos.forEach((l, i) => {
    if (!l || i === desde) return;
    if (l.fila < fila || (l.fila === fila && l.x + l.w / 2 < punto.x)) antes++;
  });
  return antes;
}
