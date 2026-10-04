/** Gym tracker (spec 07 v2). Fachada sobre el backend activo. */
import { workoutsApi } from '@/services/backend';

export type { ExerciseHistoryEntry, ExerciseRef, LegacyExercise, NoteHit, WorkoutDetail } from '@/services/contracts';
export type { SetSegment, Workout, WorkoutExercise, WorkoutExerciseDetail, WorkoutExerciseInput, WorkoutInput, WorkoutSet } from '@/types/domain';

export const listWorkouts = workoutsApi.list;
export const getWorkout = workoutsApi.getById;
export const getWorkoutByActivity = workoutsApi.getByActivity;
export const createWorkout = workoutsApi.create;
export const updateWorkout = workoutsApi.update;
export const removeWorkout = workoutsApi.remove;
export const addExercise = workoutsApi.addExercise;
export const updateExercise = workoutsApi.updateExercise;
export const removeExercise = workoutsApi.removeExercise;
export const restoreExercise = workoutsApi.restoreExercise;
export const saveWorkoutSets = workoutsApi.saveSets;
export const removeWorkoutSets = workoutsApi.removeSets;
export const createExerciseGroup = workoutsApi.createGroup;
export const removeExerciseGroup = workoutsApi.removeGroup;
export const listLegacyExercises = workoutsApi.listLegacyExercises;
export const markLegacyConverted = workoutsApi.markLegacyConverted;
export const listExerciseNames = workoutsApi.exerciseNames;
export const getExerciseHistory = workoutsApi.exerciseHistory;
export const searchWorkoutNotes = workoutsApi.searchNotes;
export const duplicateWorkout = workoutsApi.duplicate;
