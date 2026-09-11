import { addDays, startOfDay } from 'date-fns';

import { fromIso, toDayKey } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type ActivitiesByDay = Map<string, Activity[]>;

/**
 * Indexa actividades por cada día local que tocan (multi-día incluidas), en orden
 * cronológico. El orden importa en la vista mensual: es el que decide qué se ve y qué
 * cae en "+N más", y sin él las actividades superpuestas de otras personas quedaban
 * siempre al final (RF-C1, RF-S15).
 */
export function groupByDay(activities: readonly Activity[]): ActivitiesByDay {
  const map: ActivitiesByDay = new Map();
  for (const activity of activities) {
    const start = startOfDay(fromIso(activity.start_at));
    const end = fromIso(activity.end_at);
    for (let day = start; day < end; day = addDays(day, 1)) {
      const key = toDayKey(day);
      const list = map.get(key);
      if (list) list.push(activity);
      else map.set(key, [activity]);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.start_at.localeCompare(b.start_at) || a.title.localeCompare(b.title));
  }
  return map;
}
