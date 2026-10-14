import { PEOPLE_COLORS_DISPLAY } from '@/constants/people-colors';
import type { LibraryAnnotation, LibraryAnnotationInput, LibraryAnnotationKind, LibraryLocator } from '@/types/domain';

/**
 * La capa de anotaciones de KAVI Library (spec 13c, RF-BH16 – RF-BH18; T286). Lo que no depende de React ni
 * del motor: el orden de capa, qué se pinta, los filtros y el orden del panel.
 */

/** Los colores de lo anotado: los de los Nobi, en el orden de los menús (13c, RF-BH7, RF-BH14). */
export const COLORES_DE_ANOTACION = PEOPLE_COLORS_DISPLAY;
export const COLOR_DE_POSTIT = PEOPLE_COLORS_DISPLAY.find((c) => c.id === 'yellow')?.hex ?? '#F1D35D';

/** Lo que va pegado encima de la página: se mueve, tiene capa y se bloquea (RF-BH16). */
export const PEGADOS: readonly LibraryAnnotationKind[] = ['postit', 'sticker', 'textbox', 'image'];
/** Lo que el motor ya sabe pintar. Cada tarea de L3 agrega el suyo (T287 subrayados, T289 cuadros…). */
export const SE_PINTAN: readonly LibraryAnnotationKind[] = ['postit'];

/** El ancho de un post-it nuevo, relativo al de la página. */
export const ANCHO_DE_POSTIT = 0.24;
export const TEXTO_MAXIMO_DE_POSTIT = 280;

export const esPegado = (a: Pick<LibraryAnnotation, 'kind'>) => PEGADOS.includes(a.kind);

export function colorDe(a: Pick<LibraryAnnotation, 'content'>): string | null {
  const c = a.content.color;
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toUpperCase() : null;
}

export function textoDe(a: Pick<LibraryAnnotation, 'content'>): string {
  return typeof a.content.text === 'string' ? a.content.text : '';
}

/** Lo que se manda a guardar de una anotación: la fila completa, para que el último cambio gane entero. */
export function aEntrada(a: LibraryAnnotation): LibraryAnnotationInput {
  return { id: a.id, item_id: a.item_id, kind: a.kind, locator: a.locator, content: a.content, z: a.z, removed: a.removed, locked: a.locked };
}

// ─── Capas (RF-BH16) ─────────────────────────────────────────────────────────

/** La capa de algo recién pegado: encima de todo. */
export function zNueva(lista: readonly Pick<LibraryAnnotation, 'z'>[]): number {
  return lista.reduce((max, a) => Math.max(max, a.z), 0) + 1;
}

/** Traer al frente: encima de lo demás. Si ya lo está, no cambia (no se guarda nada). */
export function zAlFrente(lista: readonly Pick<LibraryAnnotation, 'id' | 'z'>[], id: string): number | null {
  const propia = lista.find((a) => a.id === id);
  if (!propia) return null;
  const otras = lista.filter((a) => a.id !== id);
  if (otras.every((a) => a.z < propia.z)) return null;
  return Math.max(...otras.map((a) => a.z)) + 1;
}

/** Mandar atrás: debajo de lo demás. */
export function zAlFondo(lista: readonly Pick<LibraryAnnotation, 'id' | 'z'>[], id: string): number | null {
  const propia = lista.find((a) => a.id === id);
  if (!propia) return null;
  const otras = lista.filter((a) => a.id !== id);
  if (otras.every((a) => a.z > propia.z)) return null;
  return Math.min(...otras.map((a) => a.z)) - 1;
}

// ─── Panel (RF-BH17) ─────────────────────────────────────────────────────────

export type FiltroDeAnotaciones = { tipo: LibraryAnnotationKind | null; color: string | null };

/** Lo que sale en el panel: lo que está en la página (lo quitado vive en su charola), con el filtro. */
export function filtrarAnotaciones(lista: readonly LibraryAnnotation[], filtro: FiltroDeAnotaciones): LibraryAnnotation[] {
  return lista.filter((a) => !a.removed && (!filtro.tipo || a.kind === filtro.tipo) && (!filtro.color || colorDe(a) === filtro.color));
}

/**
 * Dos CFI en el orden del libro. Se comparan sus pasos como números (`/6/4!/4/2:10` → 6, 4, 4, 2, 10): basta
 * para ordenar puntos del mismo libro, sin el parser completo de foliate.
 */
export function compararCfi(a: string, b: string): number {
  const pasos = (cfi: string) => (cfi.match(/\d+/g) ?? []).map(Number);
  const x = pasos(a);
  const y = pasos(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i];
  return x.length - y.length;
}

/**
 * En el orden del libro: página y altura en PDF; en EPUB, el avance y, si empata (el mismo capítulo a la
 * vista), el CFI. Empates, la más vieja primero.
 */
export function ordenarAnotaciones(lista: readonly LibraryAnnotation[]): LibraryAnnotation[] {
  const clave = (l: LibraryLocator) => (l.page != null ? l.page + (l.y ?? 0) : (l.fraction ?? 0));
  return [...lista].sort(
    (a, b) =>
      clave(a.locator) - clave(b.locator) ||
      (a.locator.cfi && b.locator.cfi ? compararCfi(a.locator.cfi, b.locator.cfi) : 0) ||
      a.created_at.localeCompare(b.created_at),
  );
}

/** Los tipos y colores que hay, para ofrecer solo filtros que encuentran algo. */
export function opcionesDeFiltro(lista: readonly LibraryAnnotation[]): { tipos: LibraryAnnotationKind[]; colores: string[] } {
  const visibles = lista.filter((a) => !a.removed);
  const tipos = [...new Set(visibles.map((a) => a.kind))];
  const hay = new Set(visibles.map(colorDe).filter((c): c is string => !!c));
  // En el orden de la paleta; un color que ya no está en ella, al final.
  const enPaleta = COLORES_DE_ANOTACION.map((c) => c.hex.toUpperCase()).filter((h) => hay.has(h));
  return { tipos, colores: [...enPaleta, ...[...hay].filter((h) => !enPaleta.includes(h))] };
}

/** Para ir a una anotación desde el panel: su página en PDF, su CFI en EPUB. */
export function destinoDe(l: LibraryLocator): { page: number } | { cfi: string } | { fraction: number } | null {
  if (l.page != null) return { page: l.page };
  if (l.cfi) return { cfi: l.cfi };
  if (l.fraction != null) return { fraction: l.fraction };
  return null;
}

// ─── Posición (spec 13 §5) ───────────────────────────────────────────────────

const fraccion = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

/**
 * Una posición de algo pegado, revisada: en PDF página y esquina (0–1) con su ancho; en EPUB, CFI con la
 * x (0–1) y el ancho. Lo que no tenga esa forma no se acepta (llega del motor por mensajes).
 */
export function localizadorPegado(crudo: unknown): LibraryLocator | null {
  if (!crudo || typeof crudo !== 'object') return null;
  const l = crudo as Record<string, unknown>;
  if (!fraccion(l.x) || !fraccion(l.w) || l.w === 0) return null;
  if (typeof l.page === 'number' && Number.isInteger(l.page) && l.page >= 1) {
    return fraccion(l.y) ? { page: l.page, x: l.x, y: l.y, w: l.w } : null;
  }
  if (typeof l.cfi === 'string' && l.cfi.startsWith('epubcfi(')) {
    return { cfi: l.cfi, x: l.x, w: l.w, ...(fraccion(l.fraction) ? { fraction: l.fraction } : {}) };
  }
  return null;
}
