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
