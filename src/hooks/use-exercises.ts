import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { buildSearchIndex, type SearchIndex } from '@/lib/gym/search';
import { useAuth } from '@/providers';
import {
  createCustomExercise,
  listExercisePrefs,
  listExercises,
  saveExercisePrefs,
  updateCustomExercise,
  type CustomExerciseInput,
  type Exercise,
  type ExercisePrefs,
} from '@/services/exercises';

export const exerciseKeys = {
  all: ['exercises'] as const,
  list: (userId: string | null) => ['exercises', 'list', userId] as const,
  prefs: (userId: string | null) => ['exercises', 'prefs', userId] as const,
};

/**
 * El catálogo completo, una vez por sesión (RF-F20). Casi nunca cambia —solo con una
 * migración o al crear un personalizado, que invalida a mano—, así que no hay por qué
 * pedirlo cada vez que se abre el selector.
 */
export function useExercises() {
  const { userId } = useAuth();
  const query = useQuery<Exercise[]>({
    queryKey: exerciseKeys.list(userId),
    queryFn: () => listExercises(userId as string),
    enabled: !!userId,
    staleTime: 60 * 60 * 1000,
  });
  /** El índice de búsqueda se arma una vez por catálogo, no en cada tecla. */
  const index = useMemo<SearchIndex>(() => buildSearchIndex(query.data ?? []), [query.data]);
  return { ...query, index };
}

export function useExercisePrefs() {
  const { userId } = useAuth();
  return useQuery<ExercisePrefs[]>({
    queryKey: exerciseKeys.prefs(userId),
    queryFn: () => listExercisePrefs(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExerciseMutations() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const uid = () => userId as string;

  /** Escribe el cambio de preferencias en caché antes de la respuesta: la estrella responde al toque. */
  const aplicarPrefs = (exerciseId: string, patch: Partial<ExercisePrefs>) =>
    qc.setQueryData<ExercisePrefs[]>(exerciseKeys.prefs(userId), (previo = []) => {
      const existe = previo.some((p) => p.exercise_id === exerciseId);
      return existe
        ? previo.map((p) => (p.exercise_id === exerciseId ? { ...p, ...patch } : p))
        : [...previo, { exercise_id: exerciseId, is_favorite: false, sticky_note: null, last_used_at: null, ...patch }];
    });

  return {
    createCustom: useMutation({
      mutationFn: (input: CustomExerciseInput) => createCustomExercise(uid(), input),
      onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.list(userId) }),
    }),
    updateCustom: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<CustomExerciseInput> & { archived?: boolean } }) => updateCustomExercise(id, patch),
      onSuccess: () => qc.invalidateQueries({ queryKey: exerciseKeys.list(userId) }),
    }),
    toggleFavorite: useMutation({
      mutationFn: ({ exerciseId, favorite }: { exerciseId: string; favorite: boolean }) =>
        saveExercisePrefs(uid(), exerciseId, { is_favorite: favorite }),
      onMutate: ({ exerciseId, favorite }) => aplicarPrefs(exerciseId, { is_favorite: favorite }),
      onError: () => qc.invalidateQueries({ queryKey: exerciseKeys.prefs(userId) }),
    }),
    /** Elegir un ejercicio lo vuelve reciente (RF-F22). */
    markUsed: useMutation({
      mutationFn: (exerciseId: string) => saveExercisePrefs(uid(), exerciseId, { last_used_at: new Date().toISOString() }),
      onMutate: (exerciseId) => aplicarPrefs(exerciseId, { last_used_at: new Date().toISOString() }),
    }),
  };
}
