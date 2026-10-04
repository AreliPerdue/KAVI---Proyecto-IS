import type { SegmentKind, SetSegment, SetType, TrackingType, WeightUnit, WorkoutSet } from '@/types/domain';

import { uuidv4 } from './ids';
import { nextDropWeight } from './tools';
import { formatWeight, fromKg, round } from './units';

/**
 * Operaciones sobre series del logger (spec 07 v2, §5). Funciones puras: reciben una serie
 * y devuelven otra nueva, para que la cola local (RF-F17) guarde el estado completo y no
 * una secuencia de cambios.
 */

export type SegmentField = 'weight_kg' | 'reps' | 'reps_left' | 'reps_right' | 'partial_reps' | 'forced_reps' | 'duration_sec' | 'distance_m';

/** Qué columnas pide la fila según lo que mide el ejercicio (RF-F30). */
export function columnsFor(tracking: TrackingType, unilateral: boolean): SegmentField[] {
  const reps: SegmentField[] = unilateral ? ['reps_left', 'reps_right'] : ['reps'];
  switch (tracking) {
    case 'weight_reps':
    case 'weighted_bodyweight':
    case 'assisted_bodyweight':
      return ['weight_kg', ...reps];
    case 'bodyweight_reps':
    case 'reps_only':
      return reps;
    case 'duration':
      return ['duration_sec'];
    case 'weight_duration':
      return ['weight_kg', 'duration_sec'];
    case 'distance_duration':
      return ['distance_m', 'duration_sec'];
    case 'weight_distance':
      return ['weight_kg', 'distance_m'];
  }
}

function segmento(setId: string, sortOrder: number, kind: SegmentKind, base: Partial<SetSegment> = {}): SetSegment {
  return {
    id: uuidv4(),
    set_id: setId,
    sort_order: sortOrder,
    kind,
    weight_kg: null,
    input_unit: 'kg',
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
    // Lo que viene de otra serie no se lleva su identidad.
  };
}

/**
 * Serie nueva, **prellenada** con lo que se va a repetir (RF-F27, RF-F31): con la serie
 * anterior de esta sesión si la hay, si no con la de la vez pasada. Así registrar una
 * serie igual es solo marcar ✓.
 */
export function newSet(workoutExerciseId: string, sortOrder: number, from: WorkoutSet | null, unit: WeightUnit): WorkoutSet {
  const id = uuidv4();
  const main = from?.segments.find((g) => g.kind === 'main') ?? from?.segments[0];
  return {
    id,
    workout_exercise_id: workoutExerciseId,
    sort_order: sortOrder,
    set_type: from && from.set_type !== 'warmup' ? from.set_type : 'working',
    intensifiers: [],
    target: from?.target ?? null,
    rpe: null,
    rir: null,
    failure: null,
    tempo: null,
    rom: null,
    side: null,
    load_mods: null,
    gear: [],
    spotter: false,
    rest_after_sec: null,
    completed_at: null,
    notes: null,
    tags: [],
    from_legacy: false,
    segments: [
      segmento(id, 0, 'main', {
        weight_kg: main?.weight_kg ?? null,
        input_unit: main?.input_unit ?? unit,
        reps: main?.reps ?? null,
        reps_left: main?.reps_left ?? null,
        reps_right: main?.reps_right ?? null,
        duration_sec: main?.duration_sec ?? null,
        distance_m: main?.distance_m ?? null,
      }),
    ],
  };
}

/** Copia una serie como nueva y pendiente (deslizar a la derecha, RF-F33). */
export function duplicateSet(set: WorkoutSet, sortOrder: number): WorkoutSet {
  const id = uuidv4();
  return {
    ...set,
    id,
    sort_order: sortOrder,
    completed_at: null,
    notes: null,
    from_legacy: false,
    segments: set.segments.map((g) => ({ ...g, id: uuidv4(), set_id: id, notes: null })),
  };
}

/** Escribe un campo de un segmento; el peso entra en la unidad de la persona y se guarda en kg. */
export function setSegmentField(set: WorkoutSet, segmentIndex: number, field: SegmentField, value: number | null, unit: WeightUnit): WorkoutSet {
  return {
    ...set,
    segments: set.segments.map((g, i) => {
      if (i !== segmentIndex) return g;
      if (field === 'weight_kg') {
        return { ...g, weight_kg: value === null ? null : unit === 'kg' ? round(value, 2) : round(value / 2.20462262185, 2), input_unit: unit };
      }
      return { ...g, [field]: value === null ? null : Math.round(value) };
    }),
  };
}

/** Valor de un campo en la unidad de la persona, para mostrarlo o editarlo. */
export function segmentFieldValue(seg: SetSegment, field: SegmentField, unit: WeightUnit): number | null {
  if (field === 'weight_kg') return seg.weight_kg === null ? null : round(fromKg(seg.weight_kg, unit), unit === 'kg' ? 2 : 1);
  return seg[field];
}

const conIntensificador = (set: WorkoutSet, clave: string) =>
  set.intensifiers.includes(clave) ? set.intensifiers : [...set.intensifiers, clave];

/**
 * `+ drop` (RF-F32, RF-F44): un segmento más con el peso bajado un porcentaje (−20 % por
 * omisión) y sin descanso. Las reps quedan vacías: son las que se van a hacer ahora.
 */
export function addDrop(set: WorkoutSet, percent: number): WorkoutSet {
  const ultimo = set.segments[set.segments.length - 1];
  return {
    ...set,
    intensifiers: conIntensificador(set, 'drop_set'),
    segments: [
      ...set.segments,
      segmento(set.id, set.segments.length, 'drop', {
        weight_kg: nextDropWeight(ultimo?.weight_kg ?? null, percent),
        input_unit: ultimo?.input_unit ?? 'kg',
        rest_before_sec: 0,
      }),
    ],
  };
}

/** `+ mini-serie` (rest-pause): mismo peso tras 15 s de pausa (RF-F44). */
export function addMiniSet(set: WorkoutSet): WorkoutSet {
  const ultimo = set.segments[set.segments.length - 1];
  return {
    ...set,
    intensifiers: conIntensificador(set, 'rest_pause'),
    segments: [
      ...set.segments,
      segmento(set.id, set.segments.length, 'rest_pause', {
        weight_kg: ultimo?.weight_kg ?? null,
        input_unit: ultimo?.input_unit ?? 'kg',
        rest_before_sec: 15,
      }),
    ],
  };
}

/** Quita un segmento extra; el `main` no se quita (sin él no hay serie). */
export function removeSegment(set: WorkoutSet, segmentIndex: number): WorkoutSet {
  if (segmentIndex === 0) return set;
  const segments = set.segments.filter((_, i) => i !== segmentIndex).map((g, i) => ({ ...g, sort_order: i }));
  const quedan = new Set(segments.map((g) => g.kind));
  return {
    ...set,
    intensifiers: set.intensifiers.filter((k) => (k === 'drop_set' ? quedan.has('drop') : k === 'rest_pause' ? quedan.has('rest_pause') : true)),
    segments,
  };
}

export function setType(set: WorkoutSet, type: SetType): WorkoutSet {
  return { ...set, set_type: type };
}

/** Lo que dice la columna "Anterior" y el resumen de una serie: "80 × 8 + 4p", "I 8 / D 7". */
export function formatSegment(seg: SetSegment, unit: WeightUnit): string {
  const partes: string[] = [];
  const reps = seg.reps !== null ? String(seg.reps) : seg.reps_left !== null || seg.reps_right !== null ? `I ${seg.reps_left ?? '–'} / D ${seg.reps_right ?? '–'}` : null;
  if (seg.weight_kg !== null && reps !== null) partes.push(`${formatWeight(seg.weight_kg, unit).replace(` ${unit}`, '')} × ${reps}`);
  else if (seg.weight_kg !== null) partes.push(formatWeight(seg.weight_kg, unit));
  else if (reps !== null) partes.push(`${reps} reps`);
  if (seg.partial_reps) partes.push(`+ ${seg.partial_reps}p`);
  if (seg.duration_sec !== null) partes.push(formatDuration(seg.duration_sec));
  if (seg.distance_m !== null) partes.push(seg.distance_m >= 1000 ? `${round(seg.distance_m / 1000, 2)} km` : `${seg.distance_m} m`);
  return partes.join(' ');
}

export function formatSet(set: WorkoutSet, unit: WeightUnit): string {
  return set.segments.map((g) => formatSegment(g, unit)).filter(Boolean).join(' → ');
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s} s`;
}

/** Desbalance entre lados que vale la pena señalar (RF-F30). */
export function isImbalanced(seg: SetSegment): boolean {
  return seg.reps_left !== null && seg.reps_right !== null && Math.abs(seg.reps_left - seg.reps_right) >= 2;
}

/** Orden para insertar al final: el último más uno, o 1 si no hay. */
export function nextSortOrder(sets: readonly WorkoutSet[]): number {
  return sets.reduce((m, s) => Math.max(m, s.sort_order), 0) + 1;
}

/** Orden entre dos vecinos, para mover una serie escribiendo solo esa fila. */
export function sortOrderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1;
  if (before === null) return (after as number) - 1;
  if (after === null) return before + 1;
  return (before + after) / 2;
}

/**
 * Partir una serie (RF-F39): cada tramo extra se vuelve su propia serie, justo después de
 * la original. Sirve para corregir un drop que en realidad fueron series separadas. La
 * primera conserva su id (y su historia); las nuevas heredan si estaba hecha.
 */
export function splitSet(set: WorkoutSet, nextSortOrderAfter: number | null): WorkoutSet[] {
  if (set.segments.length <= 1) return [set];
  const [primero, ...resto] = set.segments;
  const original: WorkoutSet = {
    ...set,
    intensifiers: set.intensifiers.filter((k) => k !== 'drop_set' && k !== 'rest_pause'),
    segments: [{ ...primero, sort_order: 0 }],
  };
  const tope = nextSortOrderAfter ?? set.sort_order + resto.length + 1;
  const paso = (tope - set.sort_order) / (resto.length + 1);
  const nuevas = resto.map((seg, i) => {
    const id = uuidv4();
    return {
      ...original,
      id,
      sort_order: set.sort_order + paso * (i + 1),
      notes: null,
      from_legacy: false,
      segments: [{ ...seg, id: uuidv4(), set_id: id, kind: 'main' as const, sort_order: 0, rest_before_sec: null }],
    };
  });
  return [original, ...nuevas];
}

/**
 * Unir dos series en una (RF-F39): los tramos de la segunda pasan a ser tramos de la
 * primera, como drop o como rest-pause. La segunda se borra; quien llama se encarga.
 */
export function mergeSets(a: WorkoutSet, b: WorkoutSet, kind: 'drop' | 'rest_pause'): WorkoutSet {
  const clave = kind === 'drop' ? 'drop_set' : 'rest_pause';
  return {
    ...a,
    intensifiers: a.intensifiers.includes(clave) ? a.intensifiers : [...a.intensifiers, clave],
    // Si cualquiera de las dos estaba hecha, la unida también: ya se hizo.
    completed_at: a.completed_at ?? b.completed_at,
    segments: [
      ...a.segments,
      ...b.segments.map((g, i) => ({
        ...g,
        id: uuidv4(),
        set_id: a.id,
        kind,
        sort_order: a.segments.length + i,
        rest_before_sec: kind === 'drop' ? 0 : g.rest_before_sec ?? 15,
      })),
    ],
  };
}
