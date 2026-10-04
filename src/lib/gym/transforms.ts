import type { ProtocolKey, IntensifierKey } from '@/constants/intensifiers';
import type { SegmentKind, SetSegment, SetTarget, WeightUnit, WorkoutSet } from '@/types/domain';

import { uuidv4 } from './ids';
import { newSet } from './sets';
import { nextDropWeight } from './tools';
import { round } from './units';

/**
 * Lo que pasa con una serie al elegir un intensificador (RF-F44): "la fila se transforma
 * sola" en la estructura correcta. 21s crea tres tramos de 7; myo-reps, una activación y
 * tres mini-series; BFR, cuatro tramos 30-15-15-15.
 *
 * Funciones puras: reciben la serie y devuelven otra. El intensificador queda en
 * `intensifiers` aunque no cree tramos (reps forzadas, tempo), porque es lo que se busca y
 * se cuenta después.
 */

type Opciones = { dropPercent: number };

function tramo(set: WorkoutSet, kind: SegmentKind, base: Partial<SetSegment> = {}): SetSegment {
  const ultimo = set.segments[set.segments.length - 1];
  return {
    id: uuidv4(),
    set_id: set.id,
    sort_order: 0,
    kind,
    weight_kg: ultimo?.weight_kg ?? null,
    input_unit: ultimo?.input_unit ?? 'kg',
    reps: null,
    reps_left: null,
    reps_right: null,
    partial_reps: null,
    forced_reps: null,
    cheat_reps: null,
    duration_sec: null,
    distance_m: null,
    rest_before_sec: null,
    variant_exercise_id: null,
    notes: null,
    ...base,
  };
}

const ordenar = (segs: SetSegment[]) => segs.map((g, i) => ({ ...g, sort_order: i }));

const marcar = (set: WorkoutSet, key: string): string[] => (set.intensifiers.includes(key) ? set.intensifiers : [...set.intensifiers, key]);

/** Agrega tramos al final de la serie. */
function conTramos(set: WorkoutSet, key: IntensifierKey, nuevos: SetSegment[]): WorkoutSet {
  return { ...set, intensifiers: marcar(set, key), segments: ordenar([...set.segments, ...nuevos]) };
}

/** Reemplaza el tramo principal por una estructura fija (21s, BFR, cluster…). */
function conEstructura(set: WorkoutSet, key: IntensifierKey, segs: SetSegment[]): WorkoutSet {
  return { ...set, intensifiers: marcar(set, key), segments: ordenar(segs) };
}

export function applyIntensifier(set: WorkoutSet, key: IntensifierKey, { dropPercent }: Opciones): WorkoutSet {
  const main = set.segments[0];
  const peso = main?.weight_kg ?? null;
  switch (key) {
    case 'drop_set':
      return conTramos(set, key, [tramo(set, 'drop', { weight_kg: nextDropWeight(set.segments[set.segments.length - 1]?.weight_kg ?? null, dropPercent), rest_before_sec: 0 })]);
    case 'strip_set':
      return conTramos(set, key, [tramo(set, 'drop', { weight_kg: nextDropWeight(set.segments[set.segments.length - 1]?.weight_kg ?? null, dropPercent), rest_before_sec: 0, notes: 'strip' })]);
    case 'mechanical_drop':
      // Mismo peso, otra variante: la variante se elige en el tramo.
      return conTramos(set, key, [tramo(set, 'drop', { weight_kg: peso, rest_before_sec: 0, notes: 'variante más fácil' })]);
    case 'rest_pause':
      return conTramos(set, key, [tramo(set, 'rest_pause', { rest_before_sec: 15 }), tramo(set, 'rest_pause', { rest_before_sec: 15 })]);
    case 'dc_rest_pause':
      return conEstructura(set, key, [
        { ...main, kind: 'main' },
        tramo(set, 'rest_pause', { weight_kg: peso, rest_before_sec: 20 }),
        tramo(set, 'rest_pause', { weight_kg: peso, rest_before_sec: 20 }),
      ]);
    case 'myo_reps':
    case 'myo_match':
      return conEstructura(set, key, [
        { ...main, kind: 'myo_activation' },
        ...[0, 1, 2].map(() => tramo(set, 'myo_mini', { weight_kg: peso, rest_before_sec: 15 })),
      ]);
    case 'cluster': {
      // 4 bloques; si había reps, se reparten.
      const porBloque = main?.reps ? Math.max(1, Math.round(main.reps / 4)) : null;
      return conEstructura(set, key, [0, 1, 2, 3].map((i) => tramo(set, 'cluster', { weight_kg: peso, reps: porBloque, rest_before_sec: i === 0 ? null : 15 })));
    }
    case 'twenty_ones':
      return conEstructura(set, key, [
        tramo(set, 'twenty_ones_bottom', { weight_kg: peso, reps: 7 }),
        tramo(set, 'twenty_ones_top', { weight_kg: peso, reps: 7, rest_before_sec: 0 }),
        tramo(set, 'twenty_ones_full', { weight_kg: peso, reps: 7, rest_before_sec: 0 }),
      ]);
    case 'bfr':
      return conEstructura(set, key, [30, 15, 15, 15].map((reps, i) => tramo(set, 'bfr', { weight_kg: peso, reps, rest_before_sec: i === 0 ? null : 30 })));
    case 'negatives':
      return conTramos(set, key, [tramo(set, 'negative', { weight_kg: peso, rest_before_sec: 0 })]);
    case 'iso_hold':
      return conTramos(set, key, [tramo(set, 'iso_hold', { weight_kg: peso, duration_sec: 30, rest_before_sec: 0 })]);
    case 'loaded_stretch':
      return conTramos(set, key, [tramo(set, 'loaded_stretch', { weight_kg: peso, duration_sec: 30, rest_before_sec: 0 })]);
    case 'burns':
      return conTramos(set, key, [tramo(set, 'partials', { weight_kg: peso, rest_before_sec: 0, notes: 'burns' })]);
    case 'tempo':
      return { ...set, intensifiers: marcar(set, key), tempo: set.tempo ?? '3-1-X-0' };
    case 'super_slow':
      return { ...set, intensifiers: marcar(set, key), tempo: '10-0-10-0' };
    case 'peak_contraction':
      return { ...set, intensifiers: marcar(set, key), tempo: set.tempo ?? 'X-0-X-2' };
    case 'paused_reps':
      return { ...set, intensifiers: marcar(set, key), tempo: set.tempo ?? 'X-2-X-0' };
    case 'dynamic_effort':
      return { ...set, intensifiers: marcar(set, key), tempo: set.tempo ?? 'X-0-X-0' };
    // Solo se marcan: su dato (reps forzadas, con trampa, parciales, bandas…) se anota en la serie.
    case 'forced_reps':
    case 'partials':
    case 'one_and_half':
    case 'cheat_reps':
    case 'accommodating':
      return { ...set, intensifiers: marcar(set, key) };
  }
}

/** Quita un intensificador y los tramos que trajo, sin tocar el principal. */
export function removeIntensifier(set: WorkoutSet, key: string): WorkoutSet {
  const trajo: Partial<Record<string, SegmentKind[]>> = {
    drop_set: ['drop'], strip_set: ['drop'], mechanical_drop: ['drop'], rest_pause: ['rest_pause'], dc_rest_pause: ['rest_pause'],
    myo_reps: ['myo_mini'], myo_match: ['myo_mini'], negatives: ['negative'], iso_hold: ['iso_hold'], loaded_stretch: ['loaded_stretch'],
    burns: ['partials'], twenty_ones: ['twenty_ones_top', 'twenty_ones_full'], bfr: ['bfr'], cluster: ['cluster'],
  };
  const quitar = new Set(trajo[key] ?? []);
  const segs = set.segments.filter((g, i) => i === 0 || !quitar.has(g.kind));
  // El primero vuelve a ser un tramo normal si el intensificador lo había cambiado.
  const [primero, ...resto] = segs;
  return {
    ...set,
    intensifiers: set.intensifiers.filter((k) => k !== key),
    tempo: ['tempo', 'super_slow', 'peak_contraction', 'paused_reps', 'dynamic_effort'].includes(key) ? null : set.tempo,
    segments: ordenar([{ ...primero, kind: 'main' }, ...resto]),
  };
}

/**
 * Combinaciones raras (RF-F48): se avisa, nunca se bloquea. Alguien puede hacer un
 * calentamiento al fallo; probablemente no quiso.
 */
export function unusualCombination(set: WorkoutSet): string | null {
  if (set.set_type === 'warmup' && (set.failure || set.intensifiers.length > 0)) return '¿Calentamiento con intensificador o al fallo? Revisa el tipo de serie.';
  if (set.intensifiers.includes('super_slow') && set.intensifiers.includes('dynamic_effort')) return 'Superlento y esfuerzo dinámico van en sentidos opuestos.';
  if (set.set_type === 'max_test' && set.intensifiers.length > 0) return 'Un test de máximo suele hacerse sin intensificadores.';
  if (set.rir !== null && set.rir > 0 && set.failure) return 'Marcaste fallo y RIR mayor que 0.';
  return null;
}

/** Objetivo con el texto que se muestra en "Anterior" cuando no hay historial. */
function serieObjetivo(exerciseId: string, orden: number, peso: number | null, target: SetTarget, unit: WeightUnit, extra: Partial<WorkoutSet> = {}): WorkoutSet {
  const s = newSet(exerciseId, orden, null, unit);
  return {
    ...s,
    target,
    ...extra,
    segments: s.segments.map((g) => ({ ...g, weight_kg: peso, reps: target.reps_min ?? null, duration_sec: target.duration_sec ?? null })),
  };
}

/**
 * Las series que genera un protocolo (RF-F46), a partir del peso de trabajo. Los pesos
 * relativos (pirámide, RPT) se redondean a lo que se puede cargar.
 */
export function protocolSets(key: ProtocolKey, exerciseId: string, startOrder: number, workKg: number | null, unit: WeightUnit): WorkoutSet[] {
  const r = (kg: number | null, f: number) => (kg === null ? null : round(Math.round((kg * f) / 2.5) * 2.5, 2));
  const n = (i: number) => startOrder + i;
  const reps = (min: number, max = min): SetTarget => ({ reps_min: min, reps_max: max });
  switch (key) {
    case 'straight_sets':
      return [0, 1, 2].map((i) => serieObjetivo(exerciseId, n(i), workKg, reps(8, 12), unit));
    case 'pyramid':
      return [[12, 0.8], [10, 0.87], [8, 0.93], [6, 1]].map(([rp, f], i) => serieObjetivo(exerciseId, n(i), r(workKg, f), reps(rp), unit));
    case 'reverse_pyramid':
      return [[6, 1], [8, 0.9], [10, 0.8]].map(([rp, f], i) => serieObjetivo(exerciseId, n(i), r(workKg, f), reps(rp), unit, { set_type: i === 0 ? 'top_set' : 'backoff' }));
    case 'wave_loading':
      return [[3, 0.9], [2, 0.95], [1, 1], [3, 0.92], [2, 0.97], [1, 1.02]].map(([rp, f], i) => serieObjetivo(exerciseId, n(i), r(workKg, f), reps(rp), unit));
    case 'ladder':
      return [1, 2, 3, 4, 5].map((rp, i) => serieObjetivo(exerciseId, n(i), workKg, reps(rp), unit));
    case 'emom':
      return Array.from({ length: 10 }, (_, i) => serieObjetivo(exerciseId, n(i), workKg, reps(5), unit));
    case 'amrap_time':
      return [serieObjetivo(exerciseId, n(0), workKg, { duration_sec: 600 }, unit, { set_type: 'amrap' })];
    case 'tabata':
      return Array.from({ length: 8 }, (_, i) => serieObjetivo(exerciseId, n(i), workKg, { duration_sec: 20 }, unit));
    case 'density':
      return [serieObjetivo(exerciseId, n(0), workKg, { duration_sec: 900 }, unit)];
    case 'fst7':
      return Array.from({ length: 7 }, (_, i) => serieObjetivo(exerciseId, n(i), workKg, reps(10, 12), unit, { rest_after_sec: null }));
    case 'gvt':
      return Array.from({ length: 10 }, (_, i) => serieObjetivo(exerciseId, n(i), workKg, reps(10), unit));
    case 'widowmaker':
      return [serieObjetivo(exerciseId, n(0), workKg, reps(20), unit)];
    case 'heavy_light':
      return [
        serieObjetivo(exerciseId, n(0), workKg, reps(5), unit, { set_type: 'top_set' }),
        serieObjetivo(exerciseId, n(1), r(workKg, 0.6), reps(15), unit, { set_type: 'backoff' }),
      ];
    case 'hit':
      return [serieObjetivo(exerciseId, n(0), workKg, reps(6, 10), unit, { set_type: 'failure', failure: 'muscular' })];
  }
}

/** Descanso que sugiere cada protocolo entre series; `null` = el de siempre. */
export function protocolRestSec(key: ProtocolKey): number | null {
  switch (key) {
    case 'fst7':
      return 40;
    case 'gvt':
      return 75;
    case 'tabata':
      return 10;
    case 'emom':
      return null;
    default:
      return null;
  }
}

/** Configuración del timer de intervalos de un protocolo (RF-F46). */
export function protocolTimer(key: ProtocolKey): { workSec: number; restSec: number; rounds: number } | null {
  switch (key) {
    case 'emom':
      return { workSec: 60, restSec: 0, rounds: 10 };
    case 'tabata':
      return { workSec: 20, restSec: 10, rounds: 8 };
    case 'amrap_time':
      return { workSec: 600, restSec: 0, rounds: 1 };
    case 'density':
      return { workSec: 900, restSec: 0, rounds: 1 };
    default:
      return null;
  }
}
