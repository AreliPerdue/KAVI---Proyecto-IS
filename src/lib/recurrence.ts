/**
 * Recurrencia simplificada (RF-C8, plan §4): DAILY / WEEKLY(BYDAY) / MONTHLY + UNTIL.
 * Se guarda como texto RRULE (RFC 5545 reducido) y se materializa a 90 días.
 */
import { addDays, addMonths, differenceInMinutes, getDay, isAfter, startOfDay } from 'date-fns';

import { fromDayKey, fromIso, toDayKey, toIso } from '@/lib/dates';

export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type RecurrenceRule = {
  freq: RecurrenceFreq;
  /** Solo WEEKLY: días 0=lunes … 6=domingo. */
  byDay: number[];
  /** 'yyyy-MM-dd' inclusive, o null = nunca (horizonte). */
  until: string | null;
};

export const RECURRENCE_HORIZON_DAYS = 90;
export const RECURRENCE_EXTEND_THRESHOLD_DAYS = 60;

const BYDAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export function toRRule(rule: RecurrenceRule): string {
  const parts = [`FREQ=${rule.freq}`];
  if (rule.freq === 'WEEKLY' && rule.byDay.length > 0) {
    parts.push(`BYDAY=${[...rule.byDay].sort().map((d) => BYDAY_CODES[d]).join(',')}`);
  }
  if (rule.until) parts.push(`UNTIL=${rule.until.replace(/-/g, '')}`);
  return parts.join(';');
}

export function parseRRule(text: string | null | undefined): RecurrenceRule | null {
  if (!text) return null;
  const map = new Map<string, string>();
  for (const part of text.split(';')) {
    const [k, v] = part.split('=');
    if (k && v) map.set(k.toUpperCase(), v);
  }
  const freq = map.get('FREQ');
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY') return null;
  const byDay = (map.get('BYDAY') ?? '')
    .split(',')
    .map((code) => BYDAY_CODES.indexOf(code as (typeof BYDAY_CODES)[number]))
    .filter((i) => i >= 0);
  const untilRaw = map.get('UNTIL');
  const until = untilRaw && /^\d{8}/.test(untilRaw) ? `${untilRaw.slice(0, 4)}-${untilRaw.slice(4, 6)}-${untilRaw.slice(6, 8)}` : null;
  return { freq, byDay, until };
}

/** Lunes = 0 … domingo = 6. */
function mondayIndex(date: Date): number {
  return (getDay(date) + 6) % 7;
}

/**
 * Fechas de inicio de las ocurrencias (excluyendo la madre) entre `after` (exclusivo)
 * y `horizonEnd` (inclusive), respetando UNTIL.
 */
export function expandOccurrences(
  rule: RecurrenceRule,
  baseStartIso: string,
  after: Date,
  horizonEnd: Date,
): Date[] {
  const base = fromIso(baseStartIso);
  const untilEnd = rule.until ? addDays(startOfDay(fromDayKey(rule.until)), 1) : null;
  const limit = untilEnd && untilEnd < horizonEnd ? untilEnd : horizonEnd;
  const result: Date[] = [];
  const timeOfDay = differenceInMinutes(base, startOfDay(base));

  if (rule.freq === 'MONTHLY') {
    for (let i = 1; i < 120; i += 1) {
      const candidate = addMonths(base, i);
      if (candidate.getDate() !== base.getDate()) continue; // meses sin ese día
      if (candidate >= limit) break;
      if (isAfter(candidate, after) && isAfter(candidate, base)) result.push(candidate);
    }
    return result;
  }

  const days = rule.freq === 'WEEKLY' && rule.byDay.length > 0 ? rule.byDay : rule.freq === 'WEEKLY' ? [mondayIndex(base)] : null;
  for (let day = startOfDay(base); day < limit; day = addDays(day, 1)) {
    const candidate = new Date(day.getTime() + timeOfDay * 60_000);
    if (candidate <= base || !isAfter(candidate, after)) continue;
    if (candidate >= limit) break;
    if (days && !days.includes(mondayIndex(day))) continue;
    result.push(candidate);
  }
  return result;
}

export function describeRecurrence(rule: RecurrenceRule | null): string {
  if (!rule) return 'No se repite';
  const names = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  let text =
    rule.freq === 'DAILY'
      ? 'Cada día'
      : rule.freq === 'MONTHLY'
        ? 'Cada mes'
        : rule.byDay.length > 0
          ? `Cada semana: ${[...rule.byDay].sort().map((d) => names[d]).join(', ')}`
          : 'Cada semana';
  if (rule.until) text += ` · hasta ${rule.until.split('-').reverse().join('/')}`;
  return text;
}

export function horizonEnd(from = new Date()): Date {
  return addDays(startOfDay(from), RECURRENCE_HORIZON_DAYS);
}

export { toDayKey, toIso };
