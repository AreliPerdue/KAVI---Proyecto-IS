/** Presets de reminders (RF-C9): minutos antes del inicio. */
export const REMINDER_PRESETS = [
  { offset: 0, label: 'Al momento' },
  { offset: 10, label: '10 min antes' },
  { offset: 30, label: '30 min antes' },
  { offset: 60, label: '1 h antes' },
  { offset: 1440, label: '1 día antes' },
] as const;

export const REMINDER_HORIZON_DAYS = 90;

export function describeOffset(offset: number): string {
  const preset = REMINDER_PRESETS.find((p) => p.offset === offset);
  if (preset) return preset.label;
  if (offset % 1440 === 0) return `${offset / 1440} días antes`;
  if (offset % 60 === 0) return `${offset / 60} h antes`;
  return `${offset} min antes`;
}

/**
 * Desfases que se ofrecen en un elemento de lista (RF-L11b).
 *
 * Llegan más lejos que los de una actividad porque responden a otra cosa: a una cita se
 * llega, y avisar con diez minutos basta; un pendiente hay que **hacerlo**, y "avísame dos
 * días antes" es lo que da tiempo de hacerlo.
 */
export const LIST_REMINDER_PRESETS = [
  { offset: 0, label: 'A la hora' },
  { offset: 60, label: '1 h antes' },
  { offset: 1440, label: '1 día antes' },
  { offset: 2880, label: '2 días antes' },
  { offset: 10080, label: '1 semana antes' },
] as const;

/**
 * Hora del día sobre la que se calcula el aviso cuando el elemento no tiene hora propia.
 *
 * "Dos días antes" de una fecha sin hora no tiene instante: hace falta un ancla. Las 9 de
 * la mañana es la primera hora en que un aviso sirve para algo y no despierta a nadie.
 */
export const LIST_REMINDER_DEFAULT_HOUR = 9;
