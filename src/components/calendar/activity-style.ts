import type { ThemeColors } from '@/constants/theme';
import type { Activity } from '@/types/domain';

/** Color visible de una actividad: override > tema (copiado) > neutro (RF-T4). */
export function activityColor(activity: Pick<Activity, 'color'>, theme: ThemeColors): string {
  return activity.color ?? theme.neutralActivity;
}

/** Relleno suave (14 %) para bloques sobre fondos claros u oscuros. */
export function tint(hex: string, alpha = 0.14): string {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
