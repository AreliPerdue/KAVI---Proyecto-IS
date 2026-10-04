import type { SetTarget, WeightUnit } from '@/types/domain';

import { e1rm, type E1rmFormula } from './e1rm';
import { round } from './units';

/** Discos que hay en cualquier gimnasio, por unidad. */
export const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

export const DEFAULT_BAR: Record<WeightUnit, number> = { kg: 20, lb: 45 };

export type PlateResult = {
  /** Discos de un lado, del más pesado al más ligero. */
  perSide: number[];
  /** Lo que de verdad pesa la barra cargada así. */
  achieved: number;
  /** Lo que falta para llegar al objetivo con los discos disponibles. */
  remainder: number;
};

/**
 * Calculadora de discos (RF-F35): qué poner de cada lado para llegar al peso objetivo.
 *
 * Voraz, del disco más pesado al más ligero. Con los juegos estándar eso da siempre la
 * combinación con menos discos. Si el objetivo no se alcanza exacto (82.3 kg), se queda en
 * lo más cercano por debajo y dice cuánto falta: mejor quedarse corto que pasarse.
 */
export function platesPerSide(target: number, bar: number, plates: readonly number[]): PlateResult {
  if (!(target > bar)) return { perSide: [], achieved: bar, remainder: round(Math.max(0, target - bar), 2) };
  let restante = (target - bar) / 2;
  const perSide: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (restante + 1e-9 >= p) {
      perSide.push(p);
      restante -= p;
    }
  }
  const achieved = round(bar + perSide.reduce((a, b) => a + b, 0) * 2, 2);
  return { perSide, achieved, remainder: round(target - achieved, 2) };
}

export type WarmupStep = { weight: number; reps: number };

/**
 * Rampa de calentamiento hacia el top set (RF-F35).
 *
 * La barra sola y luego 40/60/80 % con reps que bajan (5/3/2): suficiente para llegar
 * caliente sin cansarse antes de la serie que importa. Todo redondeado a lo que se puede
 * cargar, por encima de la barra y siempre debajo del top set. Si el top set es ligero,
 * se omiten los escalones que quedarían iguales a la barra.
 */
export function warmupRamp(topWeight: number, bar: number, increment = 2.5): WarmupStep[] {
  if (!(topWeight > bar)) return [];
  const pasos: WarmupStep[] = [{ weight: bar, reps: 10 }];
  for (const [pct, reps] of [[0.4, 5], [0.6, 3], [0.8, 2]] as const) {
    const peso = Math.round((topWeight * pct) / increment) * increment;
    if (peso > pasos[pasos.length - 1].weight && peso < topWeight) pasos.push({ weight: round(peso, 2), reps });
  }
  return pasos;
}

/** Porcentajes del 1RM para la tabla de la calculadora. */
const PORCENTAJES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50];

/** Calculadora de 1RM (RF-F35): el estimado y la tabla de porcentajes para planear. */
export function oneRmTable(weight: number, reps: number, formula: E1rmFormula): { e1rm: number; rows: { pct: number; weight: number }[] } | null {
  const est = e1rm(weight, reps, formula);
  if (est === null) return null;
  return { e1rm: round(est, 1), rows: PORCENTAJES.map((pct) => ({ pct, weight: round((est * pct) / 100, 1) })) };
}

/**
 * Doble progresión (RF-F29): si el plan era 8–12 y salieron 13, toca subir peso. Solo
 * sugiere; nunca cambia nada solo.
 */
export function shouldIncreaseWeight(target: SetTarget | null, reps: number | null): boolean {
  return !!target?.reps_max && reps !== null && reps > target.reps_max;
}

/**
 * Peso del siguiente drop (RF-F44): baja un porcentaje (−20 % por omisión) y redondea a lo
 * que se puede cargar.
 */
export function nextDropWeight(weight: number | null, percent: number, increment = 2.5): number | null {
  if (weight === null || !(weight > 0)) return null;
  const siguiente = Math.round((weight * (1 - percent / 100)) / increment) * increment;
  return siguiente > 0 ? round(siguiente, 2) : null;
}
