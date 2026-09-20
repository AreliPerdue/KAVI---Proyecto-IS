import { AuthUiError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { WorkoutDetail, WorkoutsApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type { Workout, WorkoutExercise } from '@/types/domain';

/** El título de la actividad y el conteo de ejercicios se muestran en el historial (RF-F7). */
const SELECT = '*, activity:activities(title), exercises:workout_exercises(*)';

type Row = Omit<Workout, 'activity_title' | 'exercise_count' | 'duration_minutes'> & {
  activity: { title: string } | null;
  exercises: WorkoutExercise[];
};

/** RF-F3 · La duración total se suma de los ejercicios; no hay columna que la guarde. */
function totalMinutes(exercises: WorkoutExercise[]): number | null {
  const total = exercises.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0);
  return total > 0 ? total : null;
}

function toDetail(row: Row): WorkoutDetail {
  const { activity, exercises, ...workout } = row;
  return {
    ...workout,
    activity_title: activity?.title ?? null,
    exercise_count: exercises.length,
    duration_minutes: totalMinutes(exercises),
    exercises: [...exercises].sort((a, b) => a.position - b.position),
  };
}

async function fetchDetail(id: string): Promise<WorkoutDetail> {
  const { data, error } = await getSupabase().from('workouts').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw toError(error);
  if (!data) throw new AuthUiError('Ese entrenamiento ya no existe.');
  return toDetail(data as unknown as Row);
}

/** Posición siguiente dentro del entrenamiento, para no pisar el orden existente. */
async function nextPosition(workoutId: string): Promise<number> {
  const rows = unwrap(
    await getSupabase()
      .from('workout_exercises')
      .select('position')
      .eq('workout_id', workoutId)
      .order('position', { ascending: false })
      .limit(1),
  ) as { position: number }[];
  return rows.length > 0 ? rows[0].position + 1 : 0;
}

export const supabaseWorkouts: WorkoutsApi = {
  /** Historial cronológico descendente (RF-F7). */
  async list(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('workouts')
        .select(SELECT)
        .eq('owner_id', userId)
        .order('performed_at', { ascending: false }),
    ) as unknown as Row[];
    return rows.map(toDetail);
  },

  getById: fetchDetail,

  /** Un entrenamiento por actividad como mucho (RF-F1). */
  async getByActivity(activityId, userId) {
    const { data, error } = await getSupabase()
      .from('workouts')
      .select(SELECT)
      .eq('activity_id', activityId)
      .eq('owner_id', userId)
      .maybeSingle();
    if (error) throw toError(error);
    return data ? toDetail(data as unknown as Row) : null;
  },

  async create(userId, input) {
    const created = unwrap(
      await getSupabase()
        .from('workouts')
        .insert({ ...input, owner_id: userId })
        .select('id')
        .single(),
    ) as { id: string };
    return fetchDetail(created.id);
  },

  async update(id, patch) {
    return unwrap(
      await getSupabase().from('workouts').update(patch).eq('id', id).select('*').single(),
    ) as Workout;
  },

  async remove(id) {
    const { error } = await getSupabase().from('workouts').delete().eq('id', id);
    if (error) throw toError(error);
  },

  async addExercise(workoutId, input) {
    const { position, ...fields } = input;
    return unwrap(
      await getSupabase()
        .from('workout_exercises')
        .insert({ ...fields, workout_id: workoutId, position: position ?? (await nextPosition(workoutId)) })
        .select('*')
        .single(),
    ) as WorkoutExercise;
  },

  async updateExercise(id, patch) {
    return unwrap(
      await getSupabase().from('workout_exercises').update(patch).eq('id', id).select('*').single(),
    ) as WorkoutExercise;
  },

  async removeExercise(id) {
    const { error } = await getSupabase().from('workout_exercises').delete().eq('id', id);
    if (error) throw toError(error);
  },

  /** Autocompletado con lo que esta persona ya escribió antes (RF-F4). */
  async exerciseNames(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('workout_exercises')
        .select('name, workouts!inner(owner_id)')
        .eq('workouts.owner_id', userId),
    ) as unknown as { name: string }[];
    return [...new Set(rows.map((r) => r.name))].sort((a, b) => a.localeCompare(b));
  },

  /**
   * RF-F8 · Repetir un entrenamiento. Con `keepValues` se copian series, repeticiones
   * y pesos; sin él solo viajan los nombres, para registrar la sesión desde cero.
   * Las notas nunca se copian: pertenecen a la sesión que las escribió.
   */
  async duplicate(userId, workoutId, target) {
    const source = await fetchDetail(workoutId);
    const created = unwrap(
      await getSupabase()
        .from('workouts')
        .insert({
          owner_id: userId,
          activity_id: target.activityId,
          performed_at: target.performedAt,
          notes: null,
        })
        .select('id')
        .single(),
    ) as { id: string };

    if (source.exercises.length > 0) {
      const { error } = await getSupabase().from('workout_exercises').insert(
        source.exercises.map((e) => ({
          workout_id: created.id,
          position: e.position,
          name: e.name,
          sets: target.keepValues ? e.sets : null,
          reps: target.keepValues ? e.reps : null,
          weight: target.keepValues ? e.weight : null,
          duration_minutes: target.keepValues ? e.duration_minutes : null,
          notes: null,
        })),
      );
      if (error) throw toError(error);
    }
    return fetchDetail(created.id);
  },
};
