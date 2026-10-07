/**
 * Piezas para armar historiales en las pruebas del gym. No es una prueba (no termina en
 * `.test.ts`): solo lo importan las que sí lo son.
 */
import type { LoggedSession } from '@/lib/gym/achievements';
import type { Exercise, SetSegment, WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';

let n = 0;
const sig = () => (n += 1);

export function seg(over: Partial<SetSegment> = {}): SetSegment {
  const i = sig();
  return {
    id: `seg-${i}`, set_id: 's', sort_order: 0, kind: 'main', weight_kg: null, input_unit: 'kg',
    reps: null, reps_left: null, reps_right: null, partial_reps: null, forced_reps: null, cheat_reps: null,
    duration_sec: null, distance_m: null, rest_before_sec: null, variant_exercise_id: null, notes: null,
    ...over,
  };
}

/** Una serie hecha de `kg × reps`, con tramos extra si se pasan. */
export function serie(kg: number | null, reps: number | null, over: Partial<WorkoutSet> = {}, extra: SetSegment[] = []): WorkoutSet {
  const i = sig();
  const id = over.id ?? `set-${i}`;
  return {
    id, workout_exercise_id: 'we', sort_order: i, set_type: 'working', intensifiers: [], target: null,
    rpe: null, rir: null, failure: null, tempo: null, rom: null, side: null, load_mods: null, gear: [], spotter: false,
    rest_after_sec: null, completed_at: '2026-10-01T10:00:00.000Z', notes: null, tags: [], from_legacy: false,
    segments: [seg({ weight_kg: kg, reps, set_id: id }), ...extra.map((g) => ({ ...g, set_id: id }))],
    ...over,
  };
}

export function ejercicio(exerciseId: string | null, sets: WorkoutSet[], over: Partial<WorkoutExerciseDetail> = {}): WorkoutExerciseDetail {
  const i = sig();
  return {
    id: `we-${i}`, workout_id: 'w', position: i, name: exerciseId ?? 'Libre', exercise_id: exerciseId,
    sets: null, reps: null, weight: null, duration_minutes: null, notes: null,
    group_id: null, group_position: null, protocol: null, protocol_config: null, rest_target_sec: null,
    legacy_converted_at: null, deleted_at: null, workout_sets: sets,
    ...over,
  } as WorkoutExerciseDetail;
}

export function sesion(fecha: Date, exercises: WorkoutExerciseDetail[], over: Partial<LoggedSession> = {}): LoggedSession {
  const i = sig();
  return { id: `w-${i}`, performed_at: fecha.toISOString(), bodyweight_kg: null, exercises, ...over };
}

export function delCatalogo(id: string, over: Partial<Exercise> = {}): Exercise {
  return {
    id, slug: id, name_es: id, name_en: null, aliases: [], family: null, primary_muscles: [], secondary_muscles: [],
    equipment: [], movement_pattern: null, mechanic: null, laterality: 'bilateral', tracking_type: 'weight_reps',
    created_by: null, archived_at: null,
    ...over,
  } as Exercise;
}

/** Catálogo mínimo: sentadilla (pierna), banca (pecho con tríceps de apoyo), curl (bíceps). */
export const CATALOGO = new Map<string, Exercise>([
  ['sentadilla', delCatalogo('sentadilla', { family: 'Sentadilla', primary_muscles: ['quads'], secondary_muscles: ['glutes_max'], equipment: ['barbell'] })],
  ['banca', delCatalogo('banca', { family: 'Press plano', primary_muscles: ['chest_mid'], secondary_muscles: ['triceps_long', 'delts_front'], equipment: ['barbell'] })],
  ['curl', delCatalogo('curl', { primary_muscles: ['biceps'], equipment: ['dumbbell'] })],
]);
