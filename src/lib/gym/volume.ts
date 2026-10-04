import type { SetSegment, TrackingType, WorkoutSet } from '@/types/domain';

/** Lo que hace falta saber del ejercicio y de la sesión para pesar una serie. */
export type VolumeContext = {
  trackingType: TrackingType;
  /** Peso corporal del día (RF-F36). `null` si no se anotó. */
  bodyweightKg: number | null;
};

/**
 * Carga real de un segmento según qué mide el ejercicio.
 *
 * - Con peso: el peso anotado.
 * - Peso corporal: el del día. Sin él no hay carga que sumar, y es mejor no inventarla.
 * - Lastrado: corporal + lastre. Sin corporal, solo el lastre; así los PRs siguen siendo
 *   comparables entre sí aunque nunca se haya anotado el peso del día.
 * - Asistido: corporal − asistencia. Sin corporal no se puede saber.
 * - Tiempo o distancia sin peso: sin carga.
 */
export function segmentLoadKg(seg: Pick<SetSegment, 'weight_kg'>, ctx: VolumeContext): number | null {
  switch (ctx.trackingType) {
    case 'weight_reps':
    case 'weight_duration':
    case 'weight_distance':
      return seg.weight_kg;
    case 'bodyweight_reps':
      return ctx.bodyweightKg;
    case 'weighted_bodyweight':
      return ctx.bodyweightKg === null ? seg.weight_kg : ctx.bodyweightKg + (seg.weight_kg ?? 0);
    case 'assisted_bodyweight':
      return ctx.bodyweightKg === null ? null : Math.max(0, ctx.bodyweightKg - (seg.weight_kg ?? 0));
    default:
      return null;
  }
}

/**
 * Reps completas de un segmento. Si es unilateral se suman los dos lados: cada lado movió
 * la carga. Las parciales **no** cuentan aquí: se muestran aparte (`10 + 4p`) y sumarlas
 * como completas inflaría el volumen.
 */
export function segmentReps(seg: Pick<SetSegment, 'reps' | 'reps_left' | 'reps_right'>): number {
  if (seg.reps !== null) return seg.reps;
  return (seg.reps_left ?? 0) + (seg.reps_right ?? 0);
}

export function segmentVolume(seg: SetSegment, ctx: VolumeContext): number {
  const carga = segmentLoadKg(seg, ctx);
  return carga === null ? 0 : carga * segmentReps(seg);
}

/**
 * Volumen de una serie: la suma de **todos** sus segmentos, así un drop set triple pesa
 * lo que de verdad se movió. El calentamiento no cuenta como volumen efectivo (RF-F43).
 */
export function setVolume(set: Pick<WorkoutSet, 'set_type' | 'segments'>, ctx: VolumeContext, effective = true): number {
  if (effective && set.set_type === 'warmup') return 0;
  return set.segments.reduce((total, seg) => total + segmentVolume(seg, ctx), 0);
}

/** Volumen de varias series con su contexto; solo cuentan las hechas. */
export function totalVolume(entries: readonly { set: WorkoutSet; ctx: VolumeContext }[]): number {
  return entries.reduce((total, { set, ctx }) => total + (set.completed_at ? setVolume(set, ctx) : 0), 0);
}
