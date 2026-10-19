/**
 * El lápiz de KAVI Library (spec 13c, RF-BH11; T291): las herramientas, sus grosores y colores de omisión, la
 * preferencia guardada y la revisión de los trazos que manda el motor. Sin React. Se dibuja en el motor
 * (`public/reader/ink.js`).
 */
import type { LibraryAnnotation } from '@/types/domain';

export type HerramientaDeTrazo = 'pen' | 'marker' | 'pencil';
export type HerramientaDeLapiz = HerramientaDeTrazo | 'eraser';
export const HERRAMIENTAS_DE_LAPIZ: readonly HerramientaDeLapiz[] = ['pen', 'marker', 'pencil', 'eraser'];
export const HERRAMIENTAS_DE_TRAZO: readonly HerramientaDeTrazo[] = ['pen', 'marker', 'pencil'];

/** Fino, medio y grueso. */
export type Grosor = 0 | 1 | 2;
export const GROSORES: readonly Grosor[] = [0, 1, 2];
/** En px de pantalla: el trazo de la pluma y el lápiz, el ancho del marcador y el tamaño del borrador. */
export const PX_DE_GROSOR: Record<HerramientaDeLapiz, readonly [number, number, number]> = {
  pen: [1.5, 3, 5],
  pencil: [1.5, 3, 5],
  marker: [10, 16, 24],
  eraser: [12, 22, 36],
};

/** Un trazo como lo guarda el motor: herramienta, color, grosor (parte del ancho de su caja) y puntos x, y, w. */
export type Trazo = { t: HerramientaDeTrazo; c: string; s: number; p: number[] };

/**
 * Lo que se recuerda del lápiz: la herramienta, el color y el grosor de cada una, y "solo lápiz". Un color
 * `null` es la tinta del tema del lector (se ve sobre página clara u oscura).
 */
export type PreferenciaDeLapiz = {
  tool: HerramientaDeLapiz;
  colors: Record<HerramientaDeTrazo, string | null>;
  sizes: Record<HerramientaDeLapiz, Grosor>;
  penOnly: boolean;
};

export const LAPIZ_POR_OMISION: PreferenciaDeLapiz = {
  tool: 'pen',
  colors: { pen: null, marker: '#F1D35D', pencil: null },
  sizes: { pen: 1, marker: 1, pencil: 0, eraser: 1 },
  penOnly: false,
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const esGrosor = (v: unknown): v is Grosor => v === 0 || v === 1 || v === 2;

/** La preferencia guardada, revisada: lo que no tenga forma toma el valor de omisión. */
export function lapizValido(valor: unknown): PreferenciaDeLapiz {
  const v = (valor && typeof valor === 'object' ? valor : {}) as Record<string, unknown>;
  const colores = (v.colors && typeof v.colors === 'object' ? v.colors : {}) as Record<string, unknown>;
  const grosores = (v.sizes && typeof v.sizes === 'object' ? v.sizes : {}) as Record<string, unknown>;
  const color = (h: HerramientaDeTrazo) => {
    const c = colores[h];
    return c === null ? null : typeof c === 'string' && HEX.test(c) ? c.toUpperCase() : LAPIZ_POR_OMISION.colors[h];
  };
  const grosor = (h: HerramientaDeLapiz) => (esGrosor(grosores[h]) ? grosores[h] : LAPIZ_POR_OMISION.sizes[h]);
  return {
    tool: HERRAMIENTAS_DE_LAPIZ.includes(v.tool as HerramientaDeLapiz) ? (v.tool as HerramientaDeLapiz) : 'pen',
    colors: { pen: color('pen'), marker: color('marker'), pencil: color('pencil') },
    sizes: { pen: grosor('pen'), marker: grosor('marker'), pencil: grosor('pencil'), eraser: grosor('eraser') },
    penOnly: v.penOnly === true,
  };
}

/** Lo que se le manda al motor con el lápiz puesto: el color ya resuelto (la tinta del tema si es `null`). */
export function lapizParaMotor(p: PreferenciaDeLapiz, tinta: string) {
  const h = p.tool;
  return {
    tool: h,
    color: h === 'eraser' ? tinta : (p.colors[h] ?? tinta),
    size: PX_DE_GROSOR[h][p.sizes[h]],
    penOnly: p.penOnly,
  };
}

/** Tope de trazos y de números por dibujo: lo que pase de ahí no viene del motor. */
const MAX_TRAZOS = 400;
const MAX_NUMEROS = 40_000;

/** Los trazos que manda el motor, revisados; null si algo no tiene forma (el mensaje se ignora). */
export function trazosValidos(valor: unknown): Trazo[] | null {
  if (!Array.isArray(valor) || valor.length > MAX_TRAZOS) return null;
  const trazos: Trazo[] = [];
  let numeros = 0;
  for (const t of valor) {
    if (!t || typeof t !== 'object') return null;
    const { t: h, c, s, p } = t as Record<string, unknown>;
    if (!HERRAMIENTAS_DE_TRAZO.includes(h as HerramientaDeTrazo) || typeof c !== 'string' || !HEX.test(c)) return null;
    if (typeof s !== 'number' || !Number.isFinite(s) || s <= 0 || s > 1) return null;
    if (!Array.isArray(p) || p.length < 3 || p.length % 3 !== 0 || !p.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1000)) return null;
    numeros += p.length;
    if (numeros > MAX_NUMEROS) return null;
    trazos.push({ t: h as HerramientaDeTrazo, c: c.toUpperCase(), s, p: p as number[] });
  }
  return trazos;
}

/** Los trazos de un dibujo guardado. */
export function trazosDe(a: Pick<LibraryAnnotation, 'content'>): Trazo[] {
  return trazosValidos(a.content.strokes) ?? [];
}
