/** Mini gym tracker (spec 07). Fachada sobre el backend activo. */
import { workoutsApi } from '@/services/backend';

export type { WorkoutDetail } from '@/services/contracts';
export type { Workout, WorkoutExercise, WorkoutExerciseInput, WorkoutInput } from '@/types/domain';

export const listWorkouts = workoutsApi.list;
export const getWorkout = workoutsApi.getById;
export const getWorkoutByActivity = workoutsApi.getByActivity;
export const createWorkout = workoutsApi.create;
export const updateWorkout = workoutsApi.update;
export const removeWorkout = workoutsApi.remove;
export const addExercise = workoutsApi.addExercise;
export const updateExercise = workoutsApi.updateExercise;
export const removeExercise = workoutsApi.removeExercise;
export const listExerciseNames = workoutsApi.exerciseNames;
export const duplicateWorkout = workoutsApi.duplicate;
