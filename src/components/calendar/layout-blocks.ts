import { clampToDay } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type PositionedBlock = {
  activity: Activity;
  /** minutos desde medianoche */
  start: number;
  end: number;
  /** columna y total de columnas del grupo de traslape */
  column: number;
  columns: number;
};

/** Posiciona los bloques de un día; los traslapes se reparten en columnas. */
export function layoutDay(activities: readonly Activity[], day: Date): PositionedBlock[] {
  const items = activities
    .filter((a) => !a.all_day)
    .map((activity) => ({ activity, ...clampToDay(activity.start_at, activity.end_at, day) }))
    .filter((item): item is { activity: Activity; start: number; end: number } => item.start !== undefined)
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const result: PositionedBlock[] = [];
  let group: { start: number; end: number; column: number; activity: Activity }[] = [];
  let groupEnd = -1;

  const flush = () => {
    const columns = Math.max(1, ...group.map((g) => g.column + 1));
    for (const g of group) result.push({ ...g, columns });
    group = [];
  };

  for (const item of items) {
    if (group.length > 0 && item.start >= groupEnd) flush();
    const used = new Set(group.filter((g) => g.end > item.start).map((g) => g.column));
    let column = 0;
    while (used.has(column)) column += 1;
    group.push({ ...item, column });
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (group.length > 0) flush();
  return result;
}
