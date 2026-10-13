import type { LibraryItem, LibrarySeries } from '@/types/domain';

/**
 * Sagas de KAVI Library (spec 13a, RF-BL24 – RF-BL26; T315). Sin React: la pantalla solo pinta.
 */

/** Cómo se ven las sagas en la librería (RF-BL25): lo elige la persona y se recuerda. */
export type VistaDeSagas = 'stacked' | 'loose';
export const VISTA_DE_SAGAS_POR_OMISION: VistaDeSagas = 'loose';

export function vistaDeSagasValida(valor: unknown): VistaDeSagas {
  return valor === 'stacked' || valor === 'loose' ? valor : VISTA_DE_SAGAS_POR_OMISION;
}

/** "2", "1.5": el número como lo escribiría una persona. */
export function numeroDeSaga(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** "ACOTAR #2" o solo "ACOTAR" si no tiene número (RF-BL25, vista suelta). */
export function etiquetaDeSaga(nombre: string, numero: number | null): string {
  return numero === null ? nombre : `${nombre} #${numeroDeSaga(numero)}`;
}

/** Dentro de una saga el orden es siempre el número; sin número, al final y por título. */
export function porNumero(a: Pick<LibraryItem, 'series_index' | 'title'>, b: Pick<LibraryItem, 'series_index' | 'title'>): number {
  if (a.series_index !== null && b.series_index !== null) return a.series_index - b.series_index;
  if (a.series_index !== null) return -1;
  if (b.series_index !== null) return 1;
  return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
}

export type EntradaDeLibreria = { tipo: 'pieza'; pieza: LibraryItem } | { tipo: 'saga'; saga: LibrarySeries; piezas: LibraryItem[] };

/**
 * La vista apilada (RF-BL25): los libros de una misma saga se juntan en una pila, en el lugar del
 * primero que aparezca; los demás quedan sueltos. Una saga con un solo libro visible no se apila.
 */
export function agruparSagas(items: readonly LibraryItem[], sagas: readonly LibrarySeries[]): EntradaDeLibreria[] {
  const porId = new Map(sagas.map((s) => [s.id, s]));
  const miembros = new Map<string, LibraryItem[]>();
  for (const i of items) if (i.series_id && porId.has(i.series_id)) miembros.set(i.series_id, [...(miembros.get(i.series_id) ?? []), i]);
  const puestas = new Set<string>();
  const entradas: EntradaDeLibreria[] = [];
  for (const i of items) {
    const grupo = i.series_id ? miembros.get(i.series_id) : undefined;
    if (!i.series_id || !grupo || grupo.length < 2) {
      entradas.push({ tipo: 'pieza', pieza: i });
      continue;
    }
    if (puestas.has(i.series_id)) continue;
    puestas.add(i.series_id);
    entradas.push({ tipo: 'saga', saga: porId.get(i.series_id) as LibrarySeries, piezas: [...grupo].sort(porNumero) });
  }
  return entradas;
}

/**
 * El que sigue en la saga (RF-BL26): el de número más chico mayor que el de este. Sin número no hay
 * "siguiente"; tampoco si ya lo terminó.
 */
export function siguienteDeSaga(item: Pick<LibraryItem, 'id' | 'series_id' | 'series_index'>, items: readonly LibraryItem[]): LibraryItem | null {
  if (!item.series_id || item.series_index === null) return null;
  const candidatos = items.filter((i) => i.id !== item.id && i.series_id === item.series_id && i.series_index !== null && i.series_index > (item.series_index as number) && i.progress < 1);
  return candidatos.sort(porNumero)[0] ?? null;
}

/** Busca una saga existente por nombre, sin importar mayúsculas ni espacios de más. */
export function sagaPorNombre(sagas: readonly LibrarySeries[], nombre: string): LibrarySeries | null {
  const buscado = nombre.trim().toLowerCase();
  return sagas.find((s) => s.name.trim().toLowerCase() === buscado) ?? null;
}

/** "2", "1,5", "1.5" → número; vacío o inválido → `null`. */
export function leerNumeroDeSaga(texto: string): number | null {
  const n = Number.parseFloat(texto.trim().replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
