import { addDays, startOfWeek } from 'date-fns';

import { AuthUiError } from '@/lib/auth-errors';
import type { WorkoutDetail, WorkoutsApi } from '@/services/contracts';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import type { Workout, WorkoutExercise } from '@/types/domain';

type StoredWorkout = Omit<Workout, 'activity_title' | 'exercise_count'>;

const workouts: StoredWorkout[] = [];
const exercises: WorkoutExercise[] = [];

// Seed: un entrenamiento de la semana pasada ligado a "Gimnasio · pierna" de hace 7 días.
(function seed() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const legDay = demoState.activities.find((a) => a.title === 'Gimnasio · pierna');
  const performedAt = addDays(monday, -7);
  performedAt.setHours(7, 30, 0, 0);
  const workout: StoredWorkout = {
    id: nextId('wo'),
    activity_id: null,
    owner_id: legDay?.owner_id ?? 'demo-user',
    performed_at: performedAt.toISOString(),
    duration_minutes: 75,
    notes: 'Buena sesión. Subir peso en sentadilla la próxima.',
    created_at: performedAt.toISOString(),
  };
  workouts.push(workout);
  const rows: Omit<WorkoutExercise, 'id' | 'workout_id'>[] = [
    { position: 0, name: 'Sentadilla', sets: 4, reps: '8/8/6/6', weight: '80 kg', duration_minutes: null, notes: 'Cinturón en las últimas dos' },
    { position: 1, name: 'Prensa', sets: 3, reps: '12', weight: '160 kg', duration_minutes: null, notes: null },
    { position: 2, name: 'Peso muerto rumano', sets: 3, reps: '10', weight: '60 kg', duration_minutes: null, notes: 'Dolió un poco la espalda baja' },
    { position: 3, name: 'Plancha', sets: 3, reps: 'al fallo', weight: 'corporal', duration_minutes: 5, notes: null },
  ];
  for (const row of rows) exercises.push({ id: nextId('ex'), workout_id: workout.id, ...row });
})();

function find(id: string): StoredWorkout {
  const found = workouts.find((w) => w.id === id);
  if (!found) throw new AuthUiError('Ese entrenamiento ya no existe.');
  return found;
}

function enrich(workout: StoredWorkout): Workout {
  const activity = workout.activity_id ? demoState.activities.find((a) => a.id === workout.activity_id) : null;
  return {
    ...workout,
    activity_title: activity?.title ?? null,
    exercise_count: exercises.filter((e) => e.workout_id === workout.id).length,
  };
}

function detail(workout: StoredWorkout): WorkoutDetail {
  return {
    ...enrich(workout),
    exercises: exercises
      .filter((e) => e.workout_id === workout.id)
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ ...e })),
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
      .filter((w) => w.owner_id === userId)
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at))
      .map(enrich);
  },

  async getById(id) {
    await delay(100);
    return detail(find(id));
  },

  async getByActivity(activityId, userId) {
    await delay(80);
    const found = workouts.find((w) => w.activity_id === activityId && w.owner_id === userId);
    return found ? detail(found) : null;
  },

  async create(userId, input) {
    await delay();
    if (input.activity_id && workouts.some((w) => w.activity_id === input.activity_id)) {
      throw new AuthUiError('Esa actividad ya tiene un entrenamiento registrado.');
    }
    const workout: StoredWorkout = {
      id: nextId('wo'),
      activity_id: input.activity_id ?? null,
      owner_id: userId,
      performed_at: input.performed_at,
      duration_minutes: input.duration_minutes ?? null,
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
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
      duration_minutes: patch.duration_minutes === undefined ? current.duration_minutes : patch.duration_minutes,
      notes: patch.notes === undefined ? current.notes : patch.notes,
    });
    emitDataChange();
    return enrich(current);
  },

  async remove(id) {
    await delay();
    const index = workouts.findIndex((w) => w.id === id);
    if (index >= 0) workouts.splice(index, 1);
    for (let i = exercises.length - 1; i >= 0; i -= 1) if (exercises[i]?.workout_id === id) exercises.splice(i, 1);
    emitDataChange();
  },

  async addExercise(workoutId, input) {
    await delay(60);
    find(workoutId);
    const position = input.position ?? exercises.filter((e) => e.workout_id === workoutId).length;
    const exercise: WorkoutExercise = {
      id: nextId('ex'),
      workout_id: workoutId,
      position,
      name: input.name.trim(),
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      weight: input.weight ?? null,
      duration_minutes: input.duration_minutes ?? null,
      notes: input.notes ?? null,
    };
    exercises.push(exercise);
    return { ...exercise };
  },

  async updateExercise(id, patch) {
    await delay(60);
    const exercise = exercises.find((e) => e.id === id);
    if (!exercise) throw new AuthUiError('Ese ejercicio ya no existe.');
    Object.assign(exercise, patch, patch.name !== undefined ? { name: patch.name.trim() } : {});
    return { ...exercise };
  },

  async removeExercise(id) {
    await delay(60);
    const index = exercises.findIndex((e) => e.id === id);
    if (index >= 0) exercises.splice(index, 1);
  },

  async exerciseNames(userId) {
    await delay(40);
    const mine = new Set(workouts.filter((w) => w.owner_id === userId).map((w) => w.id));
    const counts = new Map<string, number>();
    for (const e of exercises) if (mine.has(e.workout_id)) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  },

  async duplicate(userId, workoutId, target) {
    await delay();
    const source = detail(find(workoutId));
    const created = await demoWorkouts.create(userId, {
      activity_id: target.activityId,
      performed_at: target.performedAt,
      duration_minutes: target.keepValues ? source.duration_minutes : null,
      notes: null,
    });
    for (const e of source.exercises) {
      exercises.push({
        id: nextId('ex'),
        workout_id: created.id,
        position: e.position,
        name: e.name,
        sets: target.keepValues ? e.sets : null,
        reps: target.keepValues ? e.reps : null,
        weight: target.keepValues ? e.weight : null,
        duration_minutes: target.keepValues ? e.duration_minutes : null,
        notes: null,
      });
    }
    emitDataChange();
    return detail(find(created.id));
  },
};
