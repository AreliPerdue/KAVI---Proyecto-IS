import { clampToDay } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type PositionedBlock = {
  activity: Activity;
  /** minutos desde medianoche */
  start: number;
  end: number;
  /**
   * Fin con el que se pinta el bloque: nunca menor que `start + minMinutes`.
   * Una actividad de un minuto ocuparía menos que su propia línea de texto, así que se
   * le da un alto mínimo legible y ese alto es el que manda también para los traslapes.
   */
  visualEnd: number;
  /** columna y total de columnas del grupo de traslape */
  column: number;
  columns: number;
};

/**
 * Posiciona los bloques de un día; los traslapes se reparten en columnas.
 *
 * Los traslapes se calculan con el **espacio que ocupan en pantalla**, no con su duración
 * real: si no, dos actividades de un minuto separadas por dos minutos no se considerarían
 * solapadas y sus cajas —infladas al alto mínimo— se pisarían una encima de otra.
 *
 * @param minMinutes Duración mínima que ocupa un bloque al pintarse.
 */
export function layoutDay(activities: readonly Activity[], day: Date, minMinutes = 0): PositionedBlock[] {
  const items = activities
    .filter((a) => !a.all_day)
    .map((activity) => ({ activity, ...clampToDay(activity.start_at, activity.end_at, day) }))
    .filter((item): item is { activity: Activity; start: number; end: number } => item.start !== undefined)
    .map((item) => ({ ...item, visualEnd: Math.max(item.end, item.start + minMinutes) }))
    .sort((a, b) => a.start - b.start || b.visualEnd - a.visualEnd);

  const result: PositionedBlock[] = [];
  let group: { start: number; end: number; visualEnd: number; column: number; activity: Activity }[] = [];
  let groupEnd = -1;

  const flush = () => {
    const columns = Math.max(1, ...group.map((g) => g.column + 1));
    for (const g of group) result.push({ ...g, columns });
    group = [];
  };

  for (const item of items) {
    if (group.length > 0 && item.start >= groupEnd) flush();
    const used = new Set(group.filter((g) => g.visualEnd > item.start).map((g) => g.column));
    let column = 0;
    while (used.has(column)) column += 1;
    group.push({ ...item, column });
    groupEnd = Math.max(groupEnd, item.visualEnd);
  }
  if (group.length > 0) flush();
  return result;
}
