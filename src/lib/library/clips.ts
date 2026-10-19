/**
 * Fragmentos (spec 13c, RF-BH19 – RF-BH21; T317): dónde está cada uno, cómo abrir el libro ahí, y los filtros
 * de "Mis fragmentos". Sin React.
 */
import type { Posicion } from '@/lib/library/reader-protocol';
import type { LibraryClip, LibraryLocator } from '@/types/domain';

/** Lo que se guarda del lugar de un texto seleccionado: página o CFI y la parte del libro, sin sus renglones. */
export function lugarDeSeleccion(locator: LibraryLocator, fraccionActual?: number): LibraryLocator {
  const page = locator.page ?? locator.rects?.[0]?.page;
  const fraction = locator.fraction ?? fraccionActual;
  return {
    ...(page ? { page } : {}),
    ...(locator.cfi ? { cfi: locator.cfi } : {}),
    ...(typeof fraction === 'number' ? { fraction: redondo(fraction) } : {}),
  };
}

/** El lugar de un fragmento de imagen: su página y su rectángulo (PDF) o donde se leía (EPUB). */
export function lugarDeImagen(
  recorte: { page?: number; rect?: { x: number; y: number; w: number; h: number } },
  donde: { page?: number; cfi?: string; fraction?: number } | null,
): LibraryLocator {
  const page = recorte.page ?? donde?.page;
  return {
    ...(page ? { page } : {}),
    ...(recorte.rect ? { x: recorte.rect.x, y: recorte.rect.y, w: recorte.rect.w, h: recorte.rect.h } : {}),
    ...(!recorte.page && donde?.cfi ? { cfi: donde.cfi } : {}),
    ...(typeof donde?.fraction === 'number' ? { fraction: redondo(donde.fraction) } : {}),
  };
}

/** A dónde saltar para ver el fragmento en su libro. */
export function posicionDeFragmento(locator: LibraryLocator): Posicion | undefined {
  if (locator.cfi) return { cfi: locator.cfi };
  if (locator.page) return { page: locator.page };
  if (typeof locator.fraction === 'number') return { fraction: locator.fraction };
  return undefined;
}

/** La posición que llega en la ruta del lector (`?ir=`), revisada: lo que no tenga forma se ignora. */
export function posicionDeRuta(crudo: string | string[] | undefined): Posicion | undefined {
  if (typeof crudo !== 'string' || crudo.length > 2000) return undefined;
  let v: unknown;
  try {
    v = JSON.parse(crudo);
  } catch {
    return undefined;
  }
  if (!v || typeof v !== 'object') return undefined;
  const p = v as Record<string, unknown>;
  if (typeof p.cfi === 'string' && p.cfi.startsWith('epubcfi(')) return { cfi: p.cfi };
  if (typeof p.page === 'number' && Number.isInteger(p.page) && p.page >= 1) return { page: p.page };
  if (typeof p.fraction === 'number' && p.fraction >= 0 && p.fraction <= 1) return { fraction: p.fraction };
  return undefined;
}

/** "p. 12" o "34 %": dónde estaba, para la lista. */
export function dondeDeFragmento(locator: LibraryLocator, t: { page: (n: number) => string; percent: (n: number) => string }): string | null {
  if (locator.page) return t.page(locator.page);
  if (typeof locator.fraction === 'number') return t.percent(Math.round(locator.fraction * 100));
  return null;
}

export type FiltroDeFragmentos = { kind: 'all' | 'text' | 'image'; libro: string | null };

/** El libro de un fragmento para filtrar: su pieza o, si se borró, su título. */
export const libroDeFragmento = (c: Pick<LibraryClip, 'item_id' | 'book_title'>) => c.item_id ?? `titulo:${c.book_title}`;

export function filtrarFragmentos(clips: readonly LibraryClip[], filtro: FiltroDeFragmentos): LibraryClip[] {
  return clips.filter((c) => (filtro.kind === 'all' || c.kind === filtro.kind) && (!filtro.libro || libroDeFragmento(c) === filtro.libro));
}

/** Los libros que tienen fragmentos, para el filtro, de la A a la Z. */
export function librosConFragmentos(clips: readonly LibraryClip[]): { clave: string; titulo: string }[] {
  const vistos = new Map<string, string>();
  for (const c of clips) if (!vistos.has(libroDeFragmento(c))) vistos.set(libroDeFragmento(c), c.book_title);
  return [...vistos].map(([clave, titulo]) => ({ clave, titulo })).sort((a, b) => a.titulo.localeCompare(b.titulo));
}

const redondo = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
