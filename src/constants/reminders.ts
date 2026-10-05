import { getLanguage, type Language, t } from '@/i18n';

/** Presets de reminders (RF-C9): minutos antes del inicio. La etiqueta sale de `describeOffset`. */
export const REMINDER_PRESETS = [{ offset: 0 }, { offset: 10 }, { offset: 30 }, { offset: 60 }, { offset: 1440 }] as const;

export const REMINDER_HORIZON_DAYS = 90;

/** "10 min antes", "1 h antes", "Al momento"… en el idioma activo (o el indicado, en componentes). */
export function describeOffset(offset: number, lang: Language = getLanguage()): string {
  const r = t(lang).themes.reminders;
  if (offset === 0) return r.atStart;
  if (offset % 1440 === 0) return r.daysBefore(offset / 1440);
  if (offset % 60 === 0) return r.hoursBefore(offset / 60);
  return r.minutesBefore(offset);
}

/** Etiqueta de un desfase de elemento de lista: igual que `describeOffset`, salvo el 0 y la semana. */
export function describeListOffset(offset: number, lang: Language = getLanguage()): string {
  const r = t(lang).themes.reminders;
  if (offset === 0) return r.atTime;
  if (offset === 10080) return r.weekBefore;
  return describeOffset(offset, lang);
}

/**
 * Desfases que se ofrecen en un elemento de lista (RF-L11b).
 *
 * Llegan más lejos que los de una actividad porque responden a otra cosa: a una cita se
 * llega, y avisar con diez minutos basta; un pendiente hay que **hacerlo**, y "avísame dos
 * días antes" es lo que da tiempo de hacerlo.
 */
export const LIST_REMINDER_PRESETS = [{ offset: 0 }, { offset: 60 }, { offset: 1440 }, { offset: 2880 }, { offset: 10080 }] as const;

/**
 * Hora del día sobre la que se calcula el aviso cuando el elemento no tiene hora propia.
 *
 * "Dos días antes" de una fecha sin hora no tiene instante: hace falta un ancla. Las 9 de
 * la mañana es la primera hora en que un aviso sirve para algo y no despierta a nadie.
 */
export const LIST_REMINDER_DEFAULT_HOUR = 9;
