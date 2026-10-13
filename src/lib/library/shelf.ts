import { PEOPLE_COLORS } from '@/constants/people-colors';
import { INK, PAPER } from '@/constants/theme';
import { contrastRatio } from '@/lib/color';
import type { LibraryItem } from '@/types/domain';

/**
 * Lo que la librería de KAVI Library calcula para pintarse (spec 13a). Sin React: se prueba solo.
 */

/** Las vistas de la librería (RF-BL1, RF-BL3). El librero de lomos (RF-BL2) llega en L2. */
export type LibraryView = 'covers' | 'list';
export const LIBRARY_VIEWS: readonly LibraryView[] = ['covers', 'list'];
export const DEFAULT_LIBRARY_VIEW: LibraryView = 'covers';

/** Lo guardado en el dispositivo, o la vista por omisión si no es una que exista hoy. */
export function libraryViewValida(valor: unknown): LibraryView {
  return LIBRARY_VIEWS.includes(valor as LibraryView) ? (valor as LibraryView) : DEFAULT_LIBRARY_VIEW;
}

/** Ancho mínimo de una portada: con menos, el título ya no se lee. */
const PORTADA_MIN = 150;

/**
 * Columnas de la rejilla de portadas (RF-BL1): 2 en teléfono y de 4 a 6 en web, según quepan.
 * Entre tableta chica y escritorio sale lo que quepa sin bajar de `PORTADA_MIN`.
 */
export function columnasPara(ancho: number): number {
  if (ancho < 600) return 2;
  return Math.max(3, Math.min(6, Math.floor(ancho / PORTADA_MIN)));
}

/** Un número estable a partir de un texto (FNV-1a), para que cada pieza conserve su color. */
function huella(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** La imagen de portada que se ve: la que puso la persona (RF-BL23) o la del archivo (RF-BL12). */
export function rutaDePortada(item: Pick<LibraryItem, 'cover_path'> & Partial<Pick<LibraryItem, 'custom_cover_path'>>): string | null {
  return item.custom_cover_path ?? item.cover_path;
}

/**
 * Color de la portada: el de la portada propia si la hay (RF-BL23), si no el dominante de la del
 * archivo (RF-BL13) y, si no tiene, uno de los Nobi elegido por su id para que no cambie entre
 * aperturas ni entre dispositivos (RF-BL12).
 */
export function colorDePortada(item: Pick<LibraryItem, 'id' | 'cover_color'> & Partial<Pick<LibraryItem, 'custom_cover_path' | 'custom_cover_color'>>): string {
  if (item.custom_cover_path && item.custom_cover_color) return item.custom_cover_color;
  return item.cover_color ?? PEOPLE_COLORS[huella(item.id) % PEOPLE_COLORS.length].hex;
}

/** Tinta o papel, lo que mejor se lea sobre el color de una portada generada. */
export function textoSobre(fondo: string): string {
  return contrastRatio(PAPER, fondo) >= contrastRatio(INK, fondo) ? PAPER : INK;
}

export type Avance = { tipo: 'pagina'; pagina: number; total: number } | { tipo: 'porcentaje'; porcentaje: number } | { tipo: 'terminado' };

/**
 * Cuánto se ha leído (RF-BL3): "p. 120 de 340" cuando se sabe la página y el total (PDF), o el
 * porcentaje (EPUB, que se reacomoda y no tiene páginas fijas). Al 100 %, terminado, que dice más
 * que "p. 124 de 124" (y es cuando se ofrece la ficha, RF-BF6). Nada si aún no se abre.
 */
export function avanceDe(item: Pick<LibraryItem, 'page_count' | 'progress' | 'last_position'>): Avance | null {
  if (item.progress >= 1) return { tipo: 'terminado' };
  const pagina = item.last_position?.page;
  if (pagina && item.page_count) return { tipo: 'pagina', pagina: Math.min(pagina, item.page_count), total: item.page_count };
  if (item.progress > 0) return { tipo: 'porcentaje', porcentaje: Math.max(1, Math.round(item.progress * 100)) };
  return null;
}

/**
 * El nombre para el saludo de la librería (RF-BL22): el primero del nombre visible ("Areli" de "Areli
 * Perdue"). Sin nombre visible no hay nombre: el username nunca se muestra como texto (RF-A9).
 */
export function primerNombre(nombreVisible: string | null | undefined): string | null {
  const primero = nombreVisible?.trim().split(/\s+/)[0];
  return primero || null;
}
