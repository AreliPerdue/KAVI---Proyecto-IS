import type { WorkoutSet } from '@/types/domain';

import { e1rm, E1RM_RELIABLE_MAX_REPS, type E1rmFormula } from './e1rm';
import { segmentLoadKg, segmentReps, setVolume, type VolumeContext } from './volume';

export type PrKind = 'max_weight' | 'reps_at_weight' | 'e1rm' | 'set_volume';

export type SetWithContext = { set: WorkoutSet; ctx: VolumeContext };

type Metricas = {
  /** La carga más alta que se movió al menos una vez. */
  topLoad: number | null;
  /** Reps hechas con esa carga. */
  repsAtTop: number;
  e1rm: number | null;
  volume: number;
  pares: { load: number; reps: number }[];
};

function metricas({ set, ctx }: SetWithContext, formula: E1rmFormula): Metricas {
  const pares = set.segments
    .map((seg) => ({ load: segmentLoadKg(seg, ctx), reps: segmentReps(seg) }))
    .filter((p): p is { load: number; reps: number } => p.load !== null && p.load > 0 && p.reps >= 1);
  let topLoad: number | null = null;
  let repsAtTop = 0;
  let mejorE1rm: number | null = null;
  for (const p of pares) {
    if (topLoad === null || p.load > topLoad || (p.load === topLoad && p.reps > repsAtTop)) {
      topLoad = p.load;
      repsAtTop = p.reps;
    }
    if (p.reps <= E1RM_RELIABLE_MAX_REPS) {
      const est = e1rm(p.load, p.reps, formula);
      if (est !== null && (mejorE1rm === null || est > mejorE1rm)) mejorE1rm = est;
    }
  }
  return { topLoad, repsAtTop, e1rm: mejorE1rm, volume: setVolume(set, ctx), pares };
}

/** Cuenta para récords: hecha y no de calentamiento (RF-F56). */
function cuenta(set: WorkoutSet): boolean {
  return set.completed_at !== null && set.set_type !== 'warmup';
}

/**
 * Qué récords rompe una serie frente al historial del mismo ejercicio (RF-F56).
 *
 * Se compara contra el historial **sin la serie misma**, así que sirve igual en vivo que
 * al editar: si una serie se corrige a la baja, al volver a calcular deja de ser récord y
 * el anterior vuelve a serlo (RF-F40). No se guarda nada; por eso no hay nada que
 * recalcular mal.
 *
 * Sin historial no hay récord: la primera vez que haces un ejercicio todo sería "PR", y
 * celebrarlo todo es no celebrar nada.
 */
export function detectPRs(candidate: SetWithContext, history: readonly SetWithContext[], formula: E1rmFormula = 'epley'): PrKind[] {
  if (!cuenta(candidate.set)) return [];
  const previas = history.filter((h) => h.set.id !== candidate.set.id && cuenta(h.set));
  if (previas.length === 0) return [];

  const c = metricas(candidate, formula);
  const hist = previas.map((h) => metricas(h, formula));
  const max = (xs: (number | null)[]) => xs.reduce<number | null>((m, x) => (x !== null && (m === null || x > m) ? x : m), null);

  const prs: PrKind[] = [];
  const maxLoad = max(hist.map((h) => h.topLoad));
  if (c.topLoad !== null && (maxLoad === null || c.topLoad > maxLoad)) prs.push('max_weight');

  // Más reps con una carga igual o mayor a la que ya se había movido.
  if (c.topLoad !== null) {
    const conEsaCarga = hist.flatMap((h) => h.pares).filter((p) => p.load >= (c.topLoad as number));
    if (conEsaCarga.length > 0 && c.repsAtTop > Math.max(...conEsaCarga.map((p) => p.reps))) prs.push('reps_at_weight');
  }

  const maxE1rm = max(hist.map((h) => h.e1rm));
  if (c.e1rm !== null && (maxE1rm === null || c.e1rm > maxE1rm)) prs.push('e1rm');

  const maxVol = max(hist.map((h) => h.volume));
  if (c.volume > 0 && (maxVol === null || c.volume > maxVol)) prs.push('set_volume');

  return prs;
}
