import { protocolParam, type IntensifierKey, type ProtocolKey, type ProtocolParam, type ProtocolParams } from '@/constants/intensifiers';
import { getLanguage, type Language, t } from '@/i18n';
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
export function unusualCombination(set: WorkoutSet, lang: Language = getLanguage()): string | null {
  const u = t(lang).fitness.sheets.unusual;
  if (set.set_type === 'warmup' && (set.failure || set.intensifiers.length > 0)) return u.warmupIntensifier;
  if (set.intensifiers.includes('super_slow') && set.intensifiers.includes('dynamic_effort')) return u.slowAndDynamic;
  if (set.set_type === 'max_test' && set.intensifiers.length > 0) return u.maxTestIntensifier;
  if (set.rir !== null && set.rir > 0 && set.failure) return u.failureWithRir;
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
export function protocolSets(
  key: ProtocolKey,
  exerciseId: string,
  startOrder: number,
  workKg: number | null,
  unit: WeightUnit,
  params?: ProtocolParams | null,
): WorkoutSet[] {
  const r = (kg: number | null, f: number) => (kg === null ? null : round(Math.round((kg * f) / 2.5) * 2.5, 2));
  const n = (i: number) => startOrder + i;
  const reps = (min: number, max = min): SetTarget => ({ reps_min: min, reps_max: max });
  const v = (param: ProtocolParam) => protocolParam(key, param, params);
  const serie = (i: number, kg: number | null, objetivo: SetTarget, extra?: Partial<WorkoutSet>) => serieObjetivo(exerciseId, n(i), kg, objetivo, unit, extra);
  /** `cuantas` pasos con el factor de carga repartido de `desde` a `hasta`. */
  const lineal = (cuantas: number, desde: number, hasta: number) =>
    Array.from({ length: cuantas }, (_, i) => (cuantas === 1 ? hasta : desde + ((hasta - desde) * i) / (cuantas - 1)));

  switch (key) {
    case 'straight_sets': {
      const min = v('repsMin');
      const max = Math.max(min, v('repsMax'));
      return Array.from({ length: v('sets') }, (_, i) => serie(i, workKg, reps(min, max)));
    }
    case 'pyramid': {
      const pasos = v('steps');
      return lineal(pasos, 0.8, 1).map((f, i) => serie(i, r(workKg, f), reps(Math.max(2, 12 - 2 * i))));
    }
    case 'double_pyramid': {
      const pasos = v('steps');
      const subida = lineal(pasos, 0.8, 1).map((f, i) => ({ f, rp: Math.max(2, 12 - 2 * i) }));
      return [...subida, ...[...subida].reverse()].map(({ f, rp }, i) => serie(i, r(workKg, f), reps(rp)));
    }
    case 'reverse_pyramid': {
      const baja = v('dropPercent') / 100;
      return Array.from({ length: v('sets') }, (_, i) => serie(i, r(workKg, 1 - baja * i), reps(6 + 2 * i), { set_type: i === 0 ? 'top_set' : 'backoff' }));
    }
    case 'top_backoff': {
      const baja = v('dropPercent') / 100;
      return [
        serie(0, workKg, reps(5), { set_type: 'top_set' }),
        ...Array.from({ length: v('sets') }, (_, i) => serie(i + 1, r(workKg, 1 - baja), reps(8), { set_type: 'backoff' })),
      ];
    }
    case 'ramp_to_max': {
      const pasos = v('steps');
      return lineal(pasos, 0.6, 1).map((f, i) => serie(i, r(workKg, f), reps(Math.max(1, pasos - i)), i === pasos - 1 ? { set_type: 'top_set' } : undefined));
    }
    case 'five_by_five':
      return Array.from({ length: v('sets') }, (_, i) => serie(i, workKg, reps(v('reps'))));
    case 'five_three_one': {
      // Semanas de Wendler sobre el máximo de entrenamiento; la última serie es "+" (AMRAP).
      const semanas: Record<number, [number, number][]> = {
        1: [[0.65, 5], [0.75, 5], [0.85, 5]],
        2: [[0.7, 3], [0.8, 3], [0.9, 3]],
        3: [[0.75, 5], [0.85, 3], [0.95, 1]],
      };
      const semana = semanas[v('week')] ?? semanas[1]!;
      return semana.map(([f, rp], i) => serie(i, r(workKg, f), reps(rp), i === semana.length - 1 ? { set_type: 'amrap' } : undefined));
    }
    case 'wave_loading': {
      const base = [[3, 0.9], [2, 0.95], [1, 1]] as const;
      return Array.from({ length: v('rounds') }, (_, ola) => base.map(([rp, f]) => ({ rp, f: f + 0.02 * ola })))
        .flat()
        .map(({ rp, f }, i) => serie(i, r(workKg, f), reps(rp)));
    }
    case 'ladder':
      return Array.from({ length: v('steps') }, (_, i) => serie(i, workKg, reps(i + 1)));
    case 'descending_ladder': {
      const desde = v('steps');
      return Array.from({ length: desde }, (_, i) => serie(i, workKg, reps(desde - i)));
    }
    case 'hundred_reps': {
      const total = v('total');
      const series = Math.ceil(total / 25);
      return Array.from({ length: series }, (_, i) => serie(i, workKg, reps(Math.min(25, total - 25 * i))));
    }
    case 'emom':
      return Array.from({ length: v('minutes') }, (_, i) => serie(i, workKg, reps(v('reps'))));
    case 'e2mom':
      return Array.from({ length: v('rounds') }, (_, i) => serie(i, workKg, reps(v('reps'))));
    case 'death_by':
      return Array.from({ length: v('minutes') }, (_, i) => serie(i, workKg, reps(i + 1)));
    case 'amrap_time':
      return [serie(0, workKg, { duration_sec: v('minutes') * 60 }, { set_type: 'amrap' })];
    case 'tabata':
      return Array.from({ length: v('rounds') }, (_, i) => serie(i, workKg, { duration_sec: v('workSec') }));
    case 'custom_intervals':
      return Array.from({ length: v('rounds') }, (_, i) => serie(i, workKg, { duration_sec: v('workSec') }));
    case 'density':
      return [serie(0, workKg, { duration_sec: v('minutes') * 60 })];
    case 'fst7':
      return Array.from({ length: v('sets') }, (_, i) => serie(i, workKg, reps(10, 12), { rest_after_sec: null }));
    case 'gvt':
      return Array.from({ length: v('sets') }, (_, i) => serie(i, workKg, reps(v('reps'))));
    case 'widowmaker':
      return [serie(0, workKg, reps(v('reps')))];
    case 'heavy_light':
      return [serie(0, workKg, reps(5), { set_type: 'top_set' }), serie(1, r(workKg, 0.6), reps(15), { set_type: 'backoff' })];
    case 'hit':
      return [serie(0, workKg, reps(6, 10), { set_type: 'failure', failure: 'muscular' })];
  }
}

/** Descanso que sugiere cada protocolo entre series; `null` = el de siempre. */
export function protocolRestSec(key: ProtocolKey, params?: ProtocolParams | null): number | null {
  switch (key) {
    case 'fst7':
    case 'gvt':
    case 'tabata':
    case 'custom_intervals':
      return protocolParam(key, 'restSec', params);
    default:
      return null;
  }
}

/** Configuración del timer de intervalos de un protocolo (RF-F46). */
export function protocolTimer(key: ProtocolKey, params?: ProtocolParams | null): { workSec: number; restSec: number; rounds: number } | null {
  const v = (param: ProtocolParam) => protocolParam(key, param, params);
  switch (key) {
    case 'emom':
      return { workSec: 60, restSec: 0, rounds: v('minutes') };
    case 'death_by':
      return { workSec: 60, restSec: 0, rounds: v('minutes') };
    case 'e2mom':
      return { workSec: 120, restSec: 0, rounds: v('rounds') };
    case 'tabata':
    case 'custom_intervals':
      return { workSec: v('workSec'), restSec: v('restSec'), rounds: v('rounds') };
    case 'amrap_time':
      return { workSec: v('minutes') * 60, restSec: 0, rounds: 1 };
    case 'density':
      return { workSec: v('minutes') * 60, restSec: 0, rounds: 1 };
    default:
      return null;
  }
}

/**
 * Vista previa corta de lo que genera un protocolo (T303): "12 · 10 · 8 · 6", "5 × 5",
 * "3 × 8–12", "8 × 20 s / 10 s". Sale de las series que generaría, así no se desfasa.
 */
export function protocolPreview(key: ProtocolKey, params?: ProtocolParams | null): string {
  const timer = protocolTimer(key, params);
  const seg = (sec: number) => (sec >= 60 && sec % 60 === 0 ? `${sec / 60} min` : `${sec} s`);
  if (timer) {
    if (timer.rounds === 1) return seg(timer.workSec);
    return `${timer.rounds} × ${seg(timer.workSec)}${timer.restSec > 0 ? ` / ${seg(timer.restSec)}` : ''}`;
  }
  const objetivos = protocolSets(key, 'vista', 1, null, 'kg', params).map((s) => s.target);
  const texto = objetivos.map((o) => (o?.reps_min && o.reps_max && o.reps_max !== o.reps_min ? `${o.reps_min}–${o.reps_max}` : String(o?.reps_min ?? '')));
  const iguales = texto.every((t) => t === texto[0]);
  if (iguales && texto.length > 1) return `${texto.length} × ${texto[0]}`;
  if (texto.length > 7) return `${texto.slice(0, 3).join(' · ')} … ${texto.at(-1)}`;
  return texto.join(' · ');
}
