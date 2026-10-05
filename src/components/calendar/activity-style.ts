import type { ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { needsOutline } from '@/lib/color';
import type { Activity } from '@/types/domain';

/** Color visible de una actividad: override > tema (copiado) > neutro (RF-T4). */
export function activityColor(activity: Pick<Activity, 'color'>, theme: ThemeColors): string {
  return activity.color ?? theme.neutralActivity;
}

/**
 * Contorno para una actividad cuyo color casi no se distingue del fondo: el negro o el azul
 * marino de un Nobi en el calendario superpuesto, o un tema con color muy oscuro (T202).
 */
export function lowContrastOutline(color: string, theme: ThemeColors): ViewStyle | null {
  return needsOutline(color, theme.background) ? { borderWidth: 1, borderColor: theme.textTertiary } : null;
}

/** Relleno suave (14 %) para bloques sobre fondos claros u oscuros. */
export function tint(hex: string, alpha = 0.14): string {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
