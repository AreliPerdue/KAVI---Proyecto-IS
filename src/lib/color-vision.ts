import { dimensionColor } from '@/constants/dimensions';
import type { Activity, Theme } from '@/types/domain';

/**
 * Modo daltonismo (spec 05, RF-T7 – RF-T11), sin React: qué color toma cada cosa cuando está encendido.
 */

/**
 * Con el modo encendido, una actividad se pinta con el color de su dimensión (RF-T8): los temas de una misma
 * dimensión comparten color y se distinguen por su icono. Sin dimensión conserva el suyo o el neutro (RF-T4).
 */
export function withSafeColor<T extends Pick<Activity, 'color' | 'dimension'>>(activity: T): T {
  return activity.dimension ? { ...activity, color: dimensionColor(activity.dimension, true) } : activity;
}

/** La inicial que marca el bloque de otra persona (RF-T10): su primera letra, en mayúscula. */
export function initialOf(name: string | null | undefined): string | null {
  const primera = Array.from(name?.trim() ?? '')[0];
  return primera ? primera.toLocaleUpperCase('es-MX') : null;
}

/** Colores de las personas al buscar un hueco juntos: los de Paul Tol con el modo encendido. */
export const PEOPLE_PALETTE = ['#2196F3', '#9C27B0', '#FF9800', '#009688', '#E91E63'] as const;
export const SAFE_PEOPLE_PALETTE = ['#4477AA', '#AA3377', '#CCBB44', '#66CCEE', '#EE6677'] as const;

/** El color con que se ve un tema: el suyo o, con el modo encendido, el de su dimensión (RF-T8). */
export function themeColor(theme: Pick<Theme, 'color' | 'dimension'>, colorblind: boolean): string {
  return colorblind ? dimensionColor(theme.dimension, true) : theme.color;
}
