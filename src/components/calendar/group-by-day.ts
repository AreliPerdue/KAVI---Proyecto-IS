import { addDays, startOfDay } from 'date-fns';

import { fromIso, toDayKey } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type ActivitiesByDay = Map<string, Activity[]>;

/** Indexa actividades por cada día local que tocan (multi-día incluidas). */
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
  return map;
}
