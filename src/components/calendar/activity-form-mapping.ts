import { addDays } from 'date-fns';

import { fromDayKey, fromIso, minutesSinceMidnight, nextHalfHour, setTimeOfDay, startOfDay, toDayKey, toIso } from '@/lib/dates';
import { parseRRule } from '@/lib/recurrence';
import type { ActivityFormValues } from '@/lib/schemas/activity';
import type { CreateActivityInput } from '@/services/contracts';
import type { Activity, Theme } from '@/types/domain';

/** Valores por defecto: próxima media hora, 1 h de duración (RF-C5). */
export function defaultFormValues(options: { dayKey?: string; startMinutes?: number; endMinutes?: number; title?: string } = {}): ActivityFormValues {
  const now = nextHalfHour();
  const startMinutes = Math.min(options.startMinutes ?? minutesSinceMidnight(now), 1380);
  return {
    title: options.title ?? '',
    description: '',
    dayKey: options.dayKey ?? toDayKey(now),
    startMinutes,
    endMinutes: Math.min(options.endMinutes ?? startMinutes + 60, 1440),
    allDay: false,
    isGym: false,
    themeId: null,
    recurrence: null,
  };
}

export function activityToFormValues(activity: Activity, seriesRule: string | null = activity.recurrence_rule): ActivityFormValues {
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
    recurrence: parseRRule(seriesRule),
  };
}

/** Convierte el formulario a UTC y copia el estilo del tema (RF-T1, RF-T6). */
export function formValuesToInput(values: ActivityFormValues, theme: Theme | null): CreateActivityInput {
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
    theme_id: theme?.id ?? null,
    dimension: theme?.dimension ?? null,
    color: theme?.color ?? null,
    icon: theme?.icon ?? null,
    recurrence: values.recurrence,
  };
}
