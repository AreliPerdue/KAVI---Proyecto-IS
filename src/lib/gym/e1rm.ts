export type E1rmFormula = 'epley' | 'brzycki';

/**
 * Más allá de esto las fórmulas dejan de predecir bien un 1RM (RF-F56): una serie de 20
 * dice más de resistencia que de fuerza máxima. Se sigue calculando, pero los PRs de e1RM
 * solo cuentan series dentro del rango confiable.
 */
export const E1RM_RELIABLE_MAX_REPS = 12;

/**
 * 1RM estimado. Epley `w·(1+r/30)` o Brzycki `w·36/(37−r)`. Con una sola rep el estimado
 * es el peso mismo: ahí no hay nada que estimar.
 */
export function e1rm(weightKg: number | null, reps: number | null, formula: E1rmFormula = 'epley'): number | null {
  if (weightKg === null || reps === null || !(weightKg > 0) || !(reps >= 1)) return null;
  if (reps === 1) return weightKg;
  if (formula === 'brzycki') return reps >= 37 ? null : (weightKg * 36) / (37 - reps);
  return weightKg * (1 + reps / 30);
}
