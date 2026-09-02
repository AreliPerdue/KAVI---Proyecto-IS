import { addDays } from 'date-fns';

import { fromDayKey, fromIso, minutesSinceMidnight, nextHalfHour, setTimeOfDay, startOfDay, toDayKey, toIso } from '@/lib/dates';
import type { ActivityFormValues } from '@/lib/schemas/activity';
import type { Activity, ActivityInput } from '@/types/domain';

/** Valores por defecto: próxima media hora, 1 h de duración (RF-C5). */
export function defaultFormValues(options: { dayKey?: string; startMinutes?: number } = {}): ActivityFormValues {
  const now = nextHalfHour();
  const startMinutes = options.startMinutes ?? minutesSinceMidnight(now);
  return {
    title: '',
    description: '',
    dayKey: options.dayKey ?? toDayKey(now),
    startMinutes: Math.min(startMinutes, 1380),
    endMinutes: Math.min(startMinutes + 60, 1440),
    allDay: false,
    isGym: false,
    themeId: null,
  };
}

export function activityToFormValues(activity: Activity): ActivityFormValues {
  const start = fromIso(activity.start_at);
  const end = fromIso(activity.end_at);
  const sameDay = toDayKey(start) === toDayKey(end);
  return {
    title: activity.title,
    description: activity.description ?? '',
    dayKey: toDayKey(start),
    startMinutes: minutesSinceMidnight(start),
    endMinutes: sameDay ? minutesSinceMidnight(end) : 1440,
    allDay: activity.all_day,
    isGym: activity.is_gym,
    themeId: activity.theme_id,
  };
}

/** Convierte el formulario a UTC (guardar siempre en UTC). */
export function formValuesToInput(values: ActivityFormValues): Omit<ActivityInput, 'theme_id' | 'dimension' | 'color' | 'icon'> {
  const day = fromDayKey(values.dayKey);
  const start = values.allDay ? startOfDay(day) : setTimeOfDay(day, values.startMinutes);
  const end = values.allDay ? addDays(startOfDay(day), 1) : setTimeOfDay(day, values.endMinutes);
  return {
    title: values.title,
    description: values.description ? values.description : null,
    start_at: toIso(start),
    end_at: toIso(end),
    all_day: values.allDay,
    is_gym: values.isGym,
  };
}
