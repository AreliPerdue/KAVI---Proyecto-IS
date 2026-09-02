import type { WorkoutsApi } from '@/services/contracts';
import { notImplemented } from '@/services/supabase/not-implemented';

/** Fase 8 (T031): workouts + workout_exercises. */
export const supabaseWorkouts: WorkoutsApi = {
  list: () => notImplemented('workouts.list'),
  getById: () => notImplemented('workouts.getById'),
  getByActivity: async () => null,
  create: () => notImplemented('workouts.create'),
  update: () => notImplemented('workouts.update'),
  remove: () => notImplemented('workouts.remove'),
  addExercise: () => notImplemented('workouts.addExercise'),
  updateExercise: () => notImplemented('workouts.updateExercise'),
  removeExercise: () => notImplemented('workouts.removeExercise'),
  exerciseNames: async () => [],
  duplicate: () => notImplemented('workouts.duplicate'),
};
