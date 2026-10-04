import { addDays, startOfWeek } from 'date-fns';

import { AuthUiError } from '@/lib/auth-errors';
import { hasLegacyText } from '@/lib/gym/legacy';
import { ordenarPorUso } from '@/lib/gym/names';
import type { WorkoutDetail, WorkoutsApi } from '@/services/contracts';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import type { SetSegment, Workout, WorkoutExercise, WorkoutSet } from '@/types/domain';

/** Lo que guarda el demo por sesión: lo mismo que la fila, más el borrado suave. */
type StoredWorkout = Omit<Workout, 'activity_title' | 'exercise_count' | 'duration_minutes'> & { deleted_at: string | null };
type StoredExercise = WorkoutExercise & { deleted_at: string | null };
type StoredSet = Omit<WorkoutSet, 'segments'> & { deleted_at: string | null };
type StoredSegment = SetSegment & { deleted_at: string | null };

const workouts: StoredWorkout[] = [];
const exercises: StoredExercise[] = [];
const sets: StoredSet[] = [];
const segments: StoredSegment[] = [];

const ahora = () => new Date().toISOString();

/** Los campos de v2 con su valor por omisión, igual que los defaults de la migración. */
function sesionNueva(base: Omit<StoredWorkout, 'status' | 'ended_at' | 'bodyweight_kg' | 'energy' | 'pump' | 'tags' | 'updated_at' | 'edited_at' | 'deleted_at'>): StoredWorkout {
  return { ...base, status: 'completed', ended_at: null, bodyweight_kg: null, energy: null, pump: null, tags: [], updated_at: base.created_at, edited_at: null, deleted_at: null };
}

// Seed: un entrenamiento de la semana pasada, capturado como en v1 (texto libre).
(function seed() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const legDay = demoState.activities.find((a) => a.title === 'Gimnasio · pierna');
  const performedAt = addDays(monday, -7);
  performedAt.setHours(7, 30, 0, 0);
  const workout = sesionNueva({
    id: 'wo-seed-pierna',
    activity_id: null,
    owner_id: legDay?.owner_id ?? 'demo-user',
    title: 'Pierna',
    performed_at: performedAt.toISOString(),
    notes: 'Buena sesión. Subir peso en sentadilla la próxima.',
    created_at: performedAt.toISOString(),
  });
  workouts.push(workout);
  const rows: Omit<WorkoutExercise, 'id' | 'workout_id'>[] = [
    { position: 0, name: 'Sentadilla', sets: 4, reps: '8/8/6/6', weight: '80 kg', duration_minutes: null, notes: 'Cinturón en las últimas dos' },
    { position: 1, name: 'Prensa', sets: 3, reps: '12', weight: '160 kg', duration_minutes: null, notes: null },
    { position: 2, name: 'Peso muerto rumano', sets: 3, reps: '10', weight: '60 kg', duration_minutes: null, notes: 'Dolió un poco la espalda baja' },
    { position: 3, name: 'Plancha', sets: 3, reps: 'al fallo', weight: 'corporal', duration_minutes: 5, notes: null },
  ];
  for (const row of rows) exercises.push({ ...exercisePorOmision(), id: nextId('ex'), workout_id: workout.id, ...row });
})();

/** Columnas de v2 de un ejercicio, con sus valores por omisión. */
function exercisePorOmision(): Omit<StoredExercise, 'id' | 'workout_id' | 'position' | 'name' | 'sets' | 'reps' | 'weight' | 'duration_minutes' | 'notes'> {
  return { exercise_id: null, group_id: null, group_position: null, protocol: null, protocol_config: null, rest_target_sec: null, legacy_converted_at: null, deleted_at: null };
}

const vivo = <T extends { deleted_at: string | null }>(x: T) => x.deleted_at === null;

/** Sin el campo de borrado: el dominio no lo conoce. */
function limpio<T extends { deleted_at: string | null }>(x: T): Omit<T, 'deleted_at'> {
  const { deleted_at: _borrado, ...resto } = x;
  return resto;
}

function find(id: string): StoredWorkout {
  const found = workouts.find((w) => w.id === id && vivo(w));
  if (!found) throw new AuthUiError('Ese entrenamiento ya no existe.');
  return found;
}

const ejerciciosDe = (workoutId: string) => exercises.filter((e) => e.workout_id === workoutId && vivo(e));

/**
 * Duración de la sesión: de inicio a fin si terminó (v2); si no, la suma de lo anotado en
 * cada ejercicio, como en v1 (RF-F3). Igual que en Supabase.
 */
function totalMinutes(workoutId: string): number | null {
  const w = workouts.find((x) => x.id === workoutId);
  if (w?.ended_at) return Math.max(1, Math.round((new Date(w.ended_at).getTime() - new Date(w.performed_at).getTime()) / 60_000));
  const total = ejerciciosDe(workoutId).reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  return total > 0 ? total : null;
}

function enrich(workout: StoredWorkout): Workout {
  const activity = workout.activity_id ? demoState.activities.find((a) => a.id === workout.activity_id) : null;
  return {
    ...limpio(workout),
    tags: [...workout.tags],
    activity_title: activity?.title ?? null,
    exercise_count: ejerciciosDe(workout.id).length,
    duration_minutes: totalMinutes(workout.id),
  };
}

function seriesDe(exerciseId: string): WorkoutSet[] {
  return sets
    .filter((s) => s.workout_exercise_id === exerciseId && vivo(s))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      ...limpio(s),
      intensifiers: [...s.intensifiers],
      gear: [...s.gear],
      tags: [...s.tags],
      segments: segments
        .filter((g) => g.set_id === s.id && vivo(g))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((g) => ({ ...limpio(g) })),
    }));
}

/** Copias, no referencias: quien lea no puede cambiar el estado del demo por accidente. */
function detail(workout: StoredWorkout): WorkoutDetail {
  return {
    ...enrich(workout),
    exercises: ejerciciosDe(workout.id)
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ ...limpio(e), workout_sets: seriesDe(e.id) })),
    groups: [],
  };
}

/** Al borrar una actividad, el workout queda libre (FK set null). Llamado desde demo/activities. */
export function detachWorkoutsFromActivities(activityIds: string[]) {
  const ids = new Set(activityIds);
  for (const w of workouts) if (w.activity_id && ids.has(w.activity_id)) w.activity_id = null;
}

export const demoWorkouts: WorkoutsApi = {
  async list(userId) {
    await delay();
    return workouts
      .filter((w) => w.owner_id === userId && vivo(w) && w.status !== 'discarded')
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at))
      .map(enrich);
  },

  async getById(id) {
    await delay(100);
    return detail(find(id));
  },

  async getByActivity(activityId, userId) {
    await delay(80);
    const found = workouts.find((w) => w.activity_id === activityId && w.owner_id === userId && vivo(w));
    return found ? detail(found) : null;
  },

  async create(userId, input) {
    await delay();
    if (input.activity_id && workouts.some((w) => w.activity_id === input.activity_id)) {
      throw new AuthUiError('Esa actividad ya tiene un entrenamiento registrado.');
    }
    const workout: StoredWorkout = {
      ...sesionNueva({
        id: nextId('wo'),
        activity_id: input.activity_id ?? null,
        owner_id: userId,
        title: input.title?.trim() || null,
        performed_at: input.performed_at,
        notes: input.notes ?? null,
        created_at: ahora(),
      }),
      status: input.status ?? 'completed',
    };
    workouts.push(workout);
    emitDataChange();
    return detail(workout);
  },

  async update(id, patch) {
    await delay(80);
    const current = find(id);
    Object.assign(current, {
      ...patch,
      notes: patch.notes === undefined ? current.notes : patch.notes,
      updated_at: ahora(),
    });
    // Descartar suelta la actividad, igual que borrar: si no, la actividad no podría
    // volver a registrar su entrenamiento (la relación es 1:1).
    if (patch.status === 'discarded') current.activity_id = null;
    emitDataChange();
    return enrich(current);
  },

  /**
   * Borrado suave (RF-F16). Suelta la actividad para que pueda tener otro entrenamiento:
   * la relación 1:1 sigue en pie aunque la fila ya no se vea.
   */
  async remove(id) {
    await delay();
    const w = workouts.find((x) => x.id === id);
    if (w) {
      w.deleted_at = ahora();
      w.activity_id = null;
    }
    emitDataChange();
  },

  async addExercise(workoutId, input) {
    await delay(60);
    find(workoutId);
    const position = input.position ?? ejerciciosDe(workoutId).length;
    const exercise: StoredExercise = {
      ...exercisePorOmision(),
      id: nextId('ex'),
      workout_id: workoutId,
      position,
      name: input.name.trim(),
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      weight: input.weight ?? null,
      duration_minutes: input.duration_minutes ?? null,
      notes: input.notes ?? null,
      exercise_id: input.exercise_id ?? null,
    };
    exercises.push(exercise);
    return { ...limpio(exercise) };
  },

  async updateExercise(id, patch) {
    await delay(60);
    const exercise = exercises.find((e) => e.id === id && vivo(e));
    if (!exercise) throw new AuthUiError('Ese ejercicio ya no existe.');
    Object.assign(exercise, patch, patch.name !== undefined ? { name: patch.name.trim() } : {});
    return { ...limpio(exercise) };
  },

  async removeExercise(id) {
    await delay(60);
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) exercise.deleted_at = ahora();
  },

  async restoreExercise(id) {
    await delay(60);
    const exercise = exercises.find((e) => e.id === id);
    if (exercise) exercise.deleted_at = null;
  },

  async saveSets(input) {
    await delay(40);
    for (const s of input) {
      const { segments: segs, ...fila } = s;
      const previa = sets.find((x) => x.id === s.id);
      if (previa) Object.assign(previa, fila, { deleted_at: null });
      else sets.push({ ...fila, deleted_at: null });

      const conservar = new Set(segs.map((g) => g.id));
      for (const g of segments) if (g.set_id === s.id && !conservar.has(g.id) && vivo(g)) g.deleted_at = ahora();
      for (const g of segs) {
        const existente = segments.find((x) => x.id === g.id);
        if (existente) Object.assign(existente, g, { deleted_at: null });
        else segments.push({ ...g, deleted_at: null });
      }
    }
  },

  async removeSets(ids) {
    await delay(40);
    const borrar = new Set(ids);
    for (const s of sets) if (borrar.has(s.id)) s.deleted_at = ahora();
  },

  async listLegacyExercises(userId) {
    await delay(40);
    return exercises
      .filter((e) => vivo(e) && e.legacy_converted_at === null && hasLegacyText(e))
      .flatMap((e) => {
        const w = workouts.find((x) => x.id === e.workout_id && x.owner_id === userId && vivo(x));
        return w ? [{ ...limpio(e), performed_at: w.performed_at }] : [];
      });
  },

  async markLegacyConverted(ids) {
    await delay(20);
    const marcar = new Set(ids);
    const t = ahora();
    for (const e of exercises) if (marcar.has(e.id)) e.legacy_converted_at = t;
  },

  async exerciseHistory(userId, ref, limit = 60) {
    await delay(40);
    const nombre = ref.name.trim().toLowerCase();
    return exercises
      .filter((e) => vivo(e) && (ref.exerciseId ? e.exercise_id === ref.exerciseId : !e.exercise_id && e.name.trim().toLowerCase() === nombre))
      .flatMap((e) => {
        const w = workouts.find((x) => x.id === e.workout_id && x.owner_id === userId && vivo(x) && x.status !== 'discarded');
        return w ? [{ workout_id: w.id, workout_exercise_id: e.id, performed_at: w.performed_at, bodyweight_kg: w.bodyweight_kg, sets: seriesDe(e.id) }] : [];
      })
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at))
      .slice(0, limit);
  },

  async exerciseNames(userId) {
    await delay(40);
    const mine = new Set(workouts.filter((w) => w.owner_id === userId && vivo(w)).map((w) => w.id));
    return ordenarPorUso(exercises.filter((e) => mine.has(e.workout_id) && vivo(e)).map((e) => e.name));
  },

  /**
   * RF-F8 · Repetir un entrenamiento. Viaja el nombre de la sesión (v1 lo perdía). Con
   * `keepValues` viajan también las series, como pendientes: son el plan de hoy, no algo
   * que ya se hizo. Las notas nunca se copian: pertenecen a la sesión que las escribió.
   */
  async duplicate(userId, workoutId, target) {
    await delay();
    const source = detail(find(workoutId));
    const created = await demoWorkouts.create(userId, {
      activity_id: target.activityId,
      title: source.title,
      performed_at: target.performedAt,
      notes: null,
    });
    for (const e of source.exercises) {
      const nuevoId = nextId('ex');
      exercises.push({
        ...exercisePorOmision(),
        id: nuevoId,
        workout_id: created.id,
        position: e.position,
        name: e.name,
        sets: target.keepValues ? e.sets : null,
        reps: target.keepValues ? e.reps : null,
        weight: target.keepValues ? e.weight : null,
        duration_minutes: target.keepValues ? e.duration_minutes : null,
        notes: null,
        exercise_id: e.exercise_id ?? null,
        // Lo copiado ya viene convertido (o no tenía texto): no hay nada de v1 que convertir.
        legacy_converted_at: e.legacy_converted_at ?? null,
      });
      if (target.keepValues) {
        for (const s of e.workout_sets) {
          const setId = nextId('set');
          sets.push({ ...s, id: setId, workout_exercise_id: nuevoId, completed_at: null, notes: null, from_legacy: false, deleted_at: null });
          for (const g of s.segments) segments.push({ ...g, id: nextId('seg'), set_id: setId, notes: null, deleted_at: null });
        }
      }
    }
    emitDataChange();
    return detail(find(created.id));
  },
};
