import type { TrackingType, WorkoutSet } from '@/types/domain';

import type { E1rmFormula } from './e1rm';
import { detectPRs, type PrKind, type SetWithContext } from './records';
import { setVolume, type VolumeContext } from './volume';

/** Lo que se necesita de una sesión pasada; coincide con `ExerciseHistoryEntry`. */
export type HistoryLike = { workout_id: string; bodyweight_kg: number | null; sets: WorkoutSet[] };

/**
 * Lo que se hizo la vez anterior (RF-F27): la sesión más reciente distinta de la actual que
 * tenga series hechas. El historial viene del más reciente al más antiguo.
 */
export function previousSets(history: readonly HistoryLike[], currentWorkoutId: string): WorkoutSet[] {
  for (const h of history) {
    if (h.workout_id === currentWorkoutId) continue;
    const hechas = h.sets.filter((s) => s.completed_at !== null);
    if (hechas.length > 0) return hechas;
  }
  return [];
}

/**
 * Qué récords rompe cada serie de la sesión (RF-F56).
 *
 * Cada serie se compara con el historial **y con las anteriores de esta misma sesión**: si
 * la serie 1 ya fue PR, la 2 solo lo es si la supera. Se calcula siempre desde los datos,
 * así que editar una serie a la baja le quita el PR sin que haya nada que borrar (RF-F40).
 */
export function sessionPRs(
  sets: readonly WorkoutSet[],
  history: readonly HistoryLike[],
  currentWorkoutId: string,
  trackingType: TrackingType,
  bodyweightKg: number | null,
  formula: E1rmFormula,
): Map<string, PrKind[]> {
  const acumulado: SetWithContext[] = history
    .filter((h) => h.workout_id !== currentWorkoutId)
    .flatMap((h) => h.sets.map((set) => ({ set, ctx: { trackingType, bodyweightKg: h.bodyweight_kg } })));
  const ctx: VolumeContext = { trackingType, bodyweightKg };
  const resultado = new Map<string, PrKind[]>();
  for (const set of [...sets].sort((a, b) => a.sort_order - b.sort_order)) {
    const candidato = { set, ctx };
    const prs = detectPRs(candidato, acumulado, formula);
    if (prs.length > 0) resultado.set(set.id, prs);
    acumulado.push(candidato);
  }
  return resultado;
}

export type SessionSummary = {
  durationMin: number | null;
  /** Volumen efectivo en kg (sin calentamiento, solo series hechas). */
  volumeKg: number;
  setsDone: number;
  setsPending: number;
  prCount: number;
};

export function sessionSummary(
  exercises: readonly { sets: readonly WorkoutSet[]; ctx: VolumeContext; prs: Map<string, PrKind[]> }[],
  startedAt: string,
  endedAt: string | null,
): SessionSummary {
  let volumeKg = 0;
  let setsDone = 0;
  let setsPending = 0;
  let prCount = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.completed_at) {
        setsDone += 1;
        volumeKg += setVolume(s, ex.ctx);
        if (ex.prs.has(s.id)) prCount += 1;
      } else {
        setsPending += 1;
      }
    }
  }
  const fin = endedAt ? new Date(endedAt).getTime() : null;
  const durationMin = fin ? Math.max(1, Math.round((fin - new Date(startedAt).getTime()) / 60_000)) : null;
  return { durationMin, volumeKg: Math.round(volumeKg), setsDone, setsPending, prCount };
}
