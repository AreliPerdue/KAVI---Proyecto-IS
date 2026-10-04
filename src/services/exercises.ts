/** Catálogo de ejercicios (spec 07 v2, §4). Fachada sobre el backend activo. */
import { exercisesApi } from '@/services/backend';

export type { CustomExerciseInput, Exercise, ExercisePrefs } from '@/types/domain';

export const listExercises = exercisesApi.list;
export const createCustomExercise = exercisesApi.createCustom;
export const updateCustomExercise = exercisesApi.updateCustom;
export const listExercisePrefs = exercisesApi.listPrefs;
export const saveExercisePrefs = exercisesApi.savePrefs;
