import type { SetType, WeightUnit, WorkoutExercise, WorkoutSet } from '@/types/domain';

import { uuidFrom } from './ids';
import { toKg } from './units';

/**
 * Conversión del texto libre de v1 a series (RF-F62).
 *
 * La regla de oro es **no adivinar**. Lo inequívoco se convierte ("4 series, 8/8/6/6,
 * 80 kg" → cuatro series de 80 kg); lo ambiguo ("25 lb por lado", "40kg + cadena") se
 * marca como tal y el texto original se sigue mostrando para que la persona lo revise.
 * El texto de v1 nunca se toca: esta función solo lee.
 */

export type ParsedLegacySet = {
  set_type: SetType;
  reps: number | null;
  weight_kg: number | null;
  input_unit: WeightUnit;
  duration_sec: number | null;
};

export type LegacyParse = {
  sets: ParsedLegacySet[];
  /** El peso decía "corporal": el ejercicio es de peso corporal. */
  bodyweight: boolean;
  /** Hubo algo que no se pudo interpretar sin adivinar. */
  ambiguous: boolean;
  /** Por qué, en español, para la pantalla de revisión. */
  reasons: string[];
};

export type LegacyInput = Pick<WorkoutExercise, 'sets' | 'reps' | 'weight' | 'duration_minutes'>;

/** Más de esto no es un registro de series, es un texto que se interpretó mal. */
export const MAX_LEGACY_SETS = 30;

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;
const KG = String.raw`(?:kg|kgs|kilo|kilos)`;
const LB = String.raw`(?:lb|lbs|libra|libras)`;
const SEP = String.raw`\s*[\/,]\s*`;

/** Minúsculas, sin acentos y con un solo espacio: "  Peso  Corporal " → "peso corporal". */
function normalizar(texto: string | null): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const aNumero = (t: string) => Number(t.replace(',', '.'));

type Peso =
  | { kind: 'none' }
  | { kind: 'bodyweight' }
  | { kind: 'single'; kg: number; unit: WeightUnit }
  | { kind: 'list'; kg: number[]; unit: WeightUnit }
  | { kind: 'ambiguous' };

function leerPeso(texto: string | null): Peso {
  const t = normalizar(texto);
  if (!t) return { kind: 'none' };
  if (/^((peso )?corporal|bw|body ?weight|sin peso|peso propio)$/.test(t)) return { kind: 'bodyweight' };

  let m = new RegExp(`^${NUM}\\s*(${KG}|${LB})?$`).exec(t);
  if (m) {
    // Un número solo se lee en kg: KAVI se usa en México y el placeholder de v1 decía "40 kg".
    const unit: WeightUnit = m[2] && new RegExp(`^${LB}$`).test(m[2]) ? 'lb' : 'kg';
    return { kind: 'single', kg: toKg(aNumero(m[1]), unit), unit };
  }

  m = new RegExp(`^(${NUM}(?:${SEP}${NUM})+)\\s*(${KG}|${LB})?$`).exec(t);
  if (m) {
    const unit: WeightUnit = m[m.length - 1] && new RegExp(`^${LB}$`).test(m[m.length - 1]) ? 'lb' : 'kg';
    const valores = m[1].split(/[\/,]/).map((x) => toKg(aNumero(x.trim()), unit));
    return { kind: 'list', kg: valores, unit };
  }

  return { kind: 'ambiguous' };
}

type Reps =
  | { kind: 'none' }
  | { kind: 'single'; reps: number }
  | { kind: 'list'; reps: number[] }
  | { kind: 'sets_x_reps'; sets: number; reps: number }
  | { kind: 'failure' }
  | { kind: 'amrap' }
  | { kind: 'ambiguous' };

function leerReps(texto: string | null): Reps {
  const t = normalizar(texto);
  if (!t) return { kind: 'none' };
  if (/^\d+$/.test(t)) return { kind: 'single', reps: Number(t) };
  if (/^\d+(\s*[\/,-]\s*\d+)+$/.test(t)) return { kind: 'list', reps: t.split(/[\/,-]/).map((x) => Number(x.trim())) };
  const sxr = /^(\d+)\s*[x×]\s*(\d+)$/.exec(t);
  if (sxr) return { kind: 'sets_x_reps', sets: Number(sxr[1]), reps: Number(sxr[2]) };
  if (/^(al )?fallo$|^failure$/.test(t)) return { kind: 'failure' };
  if (/^(amrap|max|maximo|maximas)$/.test(t)) return { kind: 'amrap' };
  return { kind: 'ambiguous' };
}

/** ¿Tiene este ejercicio algo de v1 que convertir? Solo el nombre no cuenta. */
export function hasLegacyText(e: LegacyInput): boolean {
  return e.sets !== null || !!normalizar(e.reps) || !!normalizar(e.weight) || e.duration_minutes !== null;
}

export function parseLegacy(e: LegacyInput): LegacyParse {
  const reasons: string[] = [];
  const peso = leerPeso(e.weight);
  const reps = leerReps(e.reps);

  // 1. Cuántas series y con cuántas reps cada una.
  let cuantas = 0;
  let repsDe: (i: number) => number | null = () => null;
  let tipo: SetType = 'working';

  switch (reps.kind) {
    case 'list':
      cuantas = reps.reps.length;
      repsDe = (i) => reps.reps[i];
      if (e.sets !== null && e.sets !== cuantas) {
        reasons.push(`Decía ${e.sets} series pero ${cuantas} cantidades de reps; se usaron las reps.`);
      }
      break;
    case 'sets_x_reps':
      cuantas = reps.sets;
      repsDe = () => reps.reps;
      if (e.sets !== null && e.sets !== reps.sets) reasons.push(`Decía ${e.sets} series y "${e.reps}".`);
      break;
    case 'single':
      cuantas = e.sets ?? 1;
      repsDe = () => reps.reps;
      break;
    case 'failure':
    case 'amrap':
      cuantas = e.sets ?? 1;
      tipo = reps.kind;
      break;
    case 'none':
      cuantas = e.sets ?? (e.duration_minutes !== null || peso.kind === 'single' ? 1 : 0);
      break;
    case 'ambiguous':
      cuantas = e.sets ?? 0;
      reasons.push(`No se pudieron leer las reps: "${e.reps}".`);
      break;
  }

  if (cuantas > MAX_LEGACY_SETS) {
    reasons.push(`${cuantas} series parecen un error de captura; se dejaron como texto.`);
    cuantas = 0;
  }

  // 2. El peso de cada serie.
  let pesoDe: (i: number) => number | null = () => null;
  let unidad: WeightUnit = 'kg';
  if (peso.kind === 'single') {
    pesoDe = () => peso.kg;
    unidad = peso.unit;
  } else if (peso.kind === 'list') {
    unidad = peso.unit;
    if (peso.kg.length === cuantas) pesoDe = (i) => peso.kg[i];
    else reasons.push(`Hay ${peso.kg.length} pesos para ${cuantas} series.`);
  } else if (peso.kind === 'ambiguous') {
    reasons.push(`No se pudo leer el peso: "${e.weight}".`);
  }

  // 3. La duración de v1 era del ejercicio entero: solo se asigna si hay una sola serie.
  let duracion: number | null = null;
  if (e.duration_minutes !== null) {
    if (cuantas <= 1) {
      cuantas = Math.max(cuantas, 1);
      duracion = e.duration_minutes * 60;
    } else {
      reasons.push(`${e.duration_minutes} min eran del ejercicio completo; no se repartieron entre ${cuantas} series.`);
    }
  }

  const sets: ParsedLegacySet[] = Array.from({ length: cuantas }, (_, i) => ({
    set_type: tipo,
    reps: repsDe(i),
    weight_kg: pesoDe(i),
    input_unit: unidad,
    duration_sec: duracion,
  }));

  return { sets, bodyweight: peso.kind === 'bodyweight', ambiguous: reasons.length > 0, reasons };
}

/**
 * Las series que produce la conversión, listas para guardar.
 *
 * Los ids salen del id del ejercicio y la posición (`uuidFrom`), así que convertir dos
 * veces da las mismas filas: un `upsert`, nunca un duplicado. Nacen hechas en la fecha de
 * la sesión, porque son el registro de algo que ya pasó.
 */
export function legacySetsFor(exercise: Pick<WorkoutExercise, 'id'> & LegacyInput, performedAt: string, parsed = parseLegacy(exercise)): WorkoutSet[] {
  return parsed.sets.map((s, i) => {
    const setId = uuidFrom(`legacy:${exercise.id}:${i}`);
    return {
      id: setId,
      workout_exercise_id: exercise.id,
      sort_order: i + 1,
      set_type: s.set_type,
      intensifiers: [],
      target: null,
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
      completed_at: performedAt,
      notes: null,
      tags: [],
      from_legacy: true,
      segments: [
        {
          id: uuidFrom(`legacy:${exercise.id}:${i}:main`),
          set_id: setId,
          sort_order: 0,
          kind: 'main',
          weight_kg: s.weight_kg,
          input_unit: s.input_unit,
          reps: s.reps,
          reps_left: null,
          reps_right: null,
          partial_reps: null,
          forced_reps: null,
          cheat_reps: null,
          duration_sec: s.duration_sec,
          distance_m: null,
          rest_before_sec: null,
          variant_exercise_id: null,
          notes: null,
        },
      ],
    };
  });
}
