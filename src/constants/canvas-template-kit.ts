import { ASSETS_DE_LIENZO, type NombreDeAsset } from '@/constants/canvas-assets';
import { type DocumentoDeLienzo, documentoValido, type ElementoDeLienzo, PROPORCION_NUEVA, type Renglon } from '@/lib/library/canvas';
import { ESTE_LIBRO } from '@/lib/library/canvas-templates';
import type { Dictionary } from '@/i18n/types';

/**
 * Las piezas con que se arman las plantillas de KAVI (spec 13h, RF-CC21): un documento a partir de piezas, y atajos para
 * texto, assets, módulos y libros. Las medidas van en 0–1 de la página (vertical, 1 : √2): `y` y la altura cuentan
 * sobre el alto de la página; el alto de una pieza es `w × ar ÷ √2` del alto de la página.
 */

export type Textos = Dictionary['library']['canvas']['templates'];
export type Pieza = Partial<Omit<ElementoDeLienzo, 'id' | 'type' | 'z'>> & Pick<ElementoDeLienzo, 'type'>;

const proporcion = (nombre: NombreDeAsset) => ASSETS_DE_LIENZO.find((a) => a.id === `basicos/${nombre}`)?.ar ?? 1;

export function documento(piezas: Pieza[]): DocumentoDeLienzo {
  return documentoValido({
    pages: 1,
    elements: piezas.map((p, i) => ({ id: `k${i + 1}`, z: i + 1, page: 1, rot: 0, locked: false, group: null, style: {}, content: {}, ...p })),
  });
}

export const texto = (text: string, x: number, y: number, w: number, size = 1, ar = 0.3): Pieza => ({ type: 'textbox', x, y, w, ar, style: { size }, content: { text } });
export const asset = (nombre: NombreDeAsset, label: string, x: number, y: number, w: number, rot = 0): Pieza => ({
  type: 'asset',
  x,
  y,
  w,
  ar: proporcion(nombre),
  rot,
  content: { asset: `basicos/${nombre}`, label, mode: /destellos|flecha|rama|lazo|costura|a-mano/.test(nombre) ? 'trazo' : 'textura' },
});

/** Un libro por elegir (en un Journal) o "este libro" (en un recorte): el mismo `ESTE_LIBRO`. */
export const libro = (x: number, y: number, w: number, rot = 0): Pieza => ({ type: 'book', x, y, w, ar: 1.5, rot, content: { itemId: ESTE_LIBRO } });
export const lista = (titulo: string, items: readonly string[], x: number, y: number, w: number, ar: number = PROPORCION_NUEVA.checklist): Pieza => ({
  type: 'checklist',
  x,
  y,
  w,
  ar,
  content: { text: titulo, items: items.map((text): Renglon => ({ text, done: false })) },
});
export const linea = (items: readonly string[], x: number, y: number, w: number, ar: number = PROPORCION_NUEVA.timeline): Pieza => ({
  type: 'timeline',
  x,
  y,
  w,
  ar,
  content: { items: items.map((text) => ({ text })) },
});
export const cancion = (titulo: string, x: number, y: number, w: number): Pieza => ({ type: 'song', x, y, w, ar: PROPORCION_NUEVA.song, content: { text: titulo, who: '' } });
export const animo = (mood: NonNullable<ElementoDeLienzo['content']['mood']>, x: number, y: number, w: number, palabra = ''): Pieza => ({
  type: 'mood',
  x,
  y,
  w,
  ar: PROPORCION_NUEVA.mood,
  content: { mood, text: palabra },
});
export const fecha = (x: number, y: number, w: number, lugar = ''): Pieza => ({ type: 'date', x, y, w, ar: PROPORCION_NUEVA.date, content: { date: '', place: lugar } });
export const calificacion = (escala: 'stars' | 'hearts' | 'number', x: number, y: number, w: number): Pieza => ({
  type: 'rating',
  x,
  y,
  w,
  ar: escala === 'number' ? 0.42 : 0.2,
  content: { scale: escala, value: 0 },
});
/** Un rectángulo gris (un lomo para colorear, una casilla) con borde de tinta. */
export const caja = (x: number, y: number, w: number, ar: number, rot = 0): Pieza => ({
  type: 'shape',
  x,
  y,
  w,
  ar,
  rot,
  style: { border: { width: 0.003, color: '#1A1A1A' } },
  content: { shape: 'rect' },
});
