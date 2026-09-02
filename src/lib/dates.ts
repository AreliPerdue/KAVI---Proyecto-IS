/**
 * Helpers de fechas (plan §1): UTC en datos, zona local en UI, textos es-MX.
 * Semana inicia en lunes.
 */
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type CalendarView = 'month' | 'week' | 'day';

export type DateRange = { from: Date; to: Date };

const WEEK = { weekStartsOn: 1 } as const;

export const MINUTES_PER_DAY = 24 * 60;

/** Fecha de calendario en formato estable 'yyyy-MM-dd' (clave de día en zona local). */
export function toDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toIso(date: Date): string {
  return date.toISOString();
}

export function fromIso(iso: string): Date {
  return parseISO(iso);
}

/** Rango [from, to) visible para una vista. */
export function rangeForView(view: CalendarView, anchor: Date): DateRange {
  switch (view) {
    case 'month': {
      const from = startOfWeek(startOfMonth(anchor), WEEK);
      const to = addDays(endOfWeek(endOfMonth(anchor), WEEK), 1);
      return { from: startOfDay(from), to: startOfDay(to) };
    }
    case 'week': {
      const from = startOfWeek(anchor, WEEK);
      return { from: startOfDay(from), to: startOfDay(addWeeks(from, 1)) };
    }
    case 'day':
      return { from: startOfDay(anchor), to: startOfDay(addDays(anchor, 1)) };
  }
}

export function shiftAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  switch (view) {
    case 'month':
      return addMonths(anchor, direction);
    case 'week':
      return addWeeks(anchor, direction);
    case 'day':
      return addDays(anchor, direction);
  }
}

/** Días (siempre 6 semanas) para el grid mensual. */
export function monthGridDays(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), WEEK);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, WEEK);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export { endOfDay, isSameDay, isSameMonth, isToday, startOfDay };

/** Próxima media hora a partir de ahora (RF-C5 default). */
export function nextHalfHour(from = new Date()): Date {
  const minutes = from.getMinutes();
  const rounded = minutes < 30 ? 30 : 60;
  return setMinutes(setHours(from, from.getHours()), rounded);
}

export function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function setTimeOfDay(day: Date, minutes: number): Date {
  return addMinutes(startOfDay(day), minutes);
}

export function durationMinutes(startIso: string, endIso: string): number {
  return differenceInMinutes(fromIso(endIso), fromIso(startIso));
}

// ---------- Formatos es-MX ----------
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Septiembre 2026" */
export function formatMonthTitle(date: Date): string {
  return capitalize(format(date, 'MMMM yyyy', { locale: es }));
}

/** "7 – 13 sep 2026" */
export function formatWeekTitle(anchor: Date): string {
  const days = weekDays(anchor);
  const first = days[0] as Date;
  const last = days[6] as Date;
  if (isSameMonth(first, last)) {
    return `${format(first, 'd', { locale: es })} – ${format(last, 'd MMM yyyy', { locale: es })}`;
  }
  return `${format(first, 'd MMM', { locale: es })} – ${format(last, 'd MMM yyyy', { locale: es })}`;
}

/** "Lunes 7 de septiembre" */
export function formatDayTitle(date: Date): string {
  return capitalize(format(date, "EEEE d 'de' MMMM", { locale: es }));
}

/** "lun 7 sep" */
export function formatShortDate(date: Date): string {
  return format(date, 'EEE d MMM', { locale: es });
}

/** "7 sep 2026" */
export function formatDate(date: Date): string {
  return format(date, 'd MMM yyyy', { locale: es });
}

/** Minutos desde medianoche → "2:30 pm" (formato 12 h, es-MX). */
export function formatMinutes12(minutes: number): string {
  const total = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}

/** "2:30 pm" */
export function formatTime(date: Date): string {
  return formatMinutes12(minutesSinceMidnight(date));
}

/** Hora corta para etiquetas de timeline: "2 pm", "12 am". */
export function formatHourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? 'am' : 'pm'}`;
}

/** "14:30 – 15:30" o "Todo el día" */
export function formatTimeRange(startIso: string, endIso: string, allDay: boolean): string {
  if (allDay) return 'Todo el día';
  return `${formatTime(fromIso(startIso))} – ${formatTime(fromIso(endIso))}`;
}

/** Etiquetas cortas de la semana (lunes primero). */
export const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
export const WEEKDAY_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

/** Intersección de una actividad con un día concreto, en minutos del día [0, 1440]. */
export function clampToDay(startIso: string, endIso: string, day: Date): { start: number; end: number } | null {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = fromIso(startIso);
  const end = fromIso(endIso);
  if (end <= dayStart || start >= dayEnd) return null;
  const s = start < dayStart ? 0 : minutesSinceMidnight(start);
  const e = end >= dayEnd ? MINUTES_PER_DAY : minutesSinceMidnight(end);
  return { start: s, end: Math.max(e, s + 15) };
}

export type Interval = { start: Date; end: Date };

/**
 * Huecos donde nadie está ocupado, dentro de [from, to), de al menos `durationMinutes`,
 * limitados a la franja [dayStartHour, dayEndHour) de cada día (RF-S9).
 */
export function findFreeSlots(
  busy: readonly Interval[],
  from: Date,
  to: Date,
  durationMinutes: number,
  dayStartHour = 7,
  dayEndHour = 22,
): Interval[] {
  const sorted = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());
  const slots: Interval[] = [];
  const stepMs = 30 * 60_000;
  const durationMs = durationMinutes * 60_000;

  for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
    const windowStart = new Date(Math.max(setTimeOfDay(day, dayStartHour * 60).getTime(), from.getTime()));
    const windowEnd = new Date(Math.min(setTimeOfDay(day, dayEndHour * 60).getTime(), to.getTime()));
    for (let cursor = windowStart; cursor.getTime() + durationMs <= windowEnd.getTime(); cursor = new Date(cursor.getTime() + stepMs)) {
      const candidateEnd = new Date(cursor.getTime() + durationMs);
      const conflict = sorted.some((b) => b.start < candidateEnd && b.end > cursor);
      if (!conflict) {
        slots.push({ start: cursor, end: candidateEnd });
        cursor = new Date(candidateEnd.getTime() - stepMs); // salta al final del hueco encontrado
      }
    }
  }
  return slots;
}
