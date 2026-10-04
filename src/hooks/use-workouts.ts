import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import {
  addExercise,
  createWorkout,
  duplicateWorkout,
  getWorkout,
  getWorkoutByActivity,
  listExerciseNames,
  listWorkouts,
  searchWorkoutNotes,
  removeExercise,
  removeWorkout,
  restoreExercise,
  saveWorkoutSets,
  createExerciseGroup,
  removeExerciseGroup,
  updateExercise,
  updateWorkout,
  type NoteHit,
  type Workout,
  type WorkoutDetail,
  type WorkoutExerciseInput,
  type WorkoutInput,
  type WorkoutSet,
} from '@/services/workouts';

export const workoutKeys = {
  all: ['workouts'] as const,
  list: (userId: string | null) => ['workouts', 'list', userId] as const,
  detail: (id: string) => ['workouts', 'detail', id] as const,
  byActivity: (activityId: string, userId: string | null) => ['workouts', 'activity', activityId, userId] as const,
  names: (userId: string | null) => ['workouts', 'names', userId] as const,
};

export function useWorkouts() {
  const { userId } = useAuth();
  return useQuery<Workout[]>({ queryKey: workoutKeys.list(userId), queryFn: () => listWorkouts(userId as string), enabled: !!userId });
}

export function useWorkout(id: string | undefined) {
  return useQuery<WorkoutDetail>({ queryKey: workoutKeys.detail(id ?? ''), queryFn: () => getWorkout(id as string), enabled: !!id });
}

export function useWorkoutByActivity(activityId: string | undefined, enabled = true) {
  const { userId } = useAuth();
  return useQuery<WorkoutDetail | null>({
    queryKey: workoutKeys.byActivity(activityId ?? '', userId),
    queryFn: () => getWorkoutByActivity(activityId as string, userId as string),
    enabled: !!activityId && !!userId && enabled,
  });
}

export function useExerciseNames() {
  const { userId } = useAuth();
  return useQuery<string[]>({ queryKey: workoutKeys.names(userId), queryFn: () => listExerciseNames(userId as string), enabled: !!userId, staleTime: 60_000 });
}

/** Búsqueda de notas del historial (RF-F53); con menos de dos letras no consulta. */
export function useNoteSearch(term: string) {
  const { userId } = useAuth();
  const limpio = term.trim();
  return useQuery<NoteHit[]>({
    queryKey: ['workouts', 'notes', userId, limpio],
    queryFn: () => searchWorkoutNotes(userId as string, limpio),
    enabled: !!userId && limpio.length >= 2,
    placeholderData: (previo) => previo,
  });
}

export function useWorkoutMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: workoutKeys.all });
  const uid = () => userId as string;

  return {
    create: useMutation({ mutationFn: (input: WorkoutInput) => createWorkout(uid(), input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<WorkoutInput> }) => updateWorkout(id, patch),
      /*
       * El encabezado se actualiza al momento: los chips de energía, pump y etiquetas
       * (RF-F49) se tocan seguido, y esperar al servidor entre toque y toque haría que el
       * segundo partiera de datos viejos y borrara el primero.
       */
      onMutate: ({ id, patch }) => {
        queryClient.setQueryData<WorkoutDetail>(workoutKeys.detail(id), (previo) => (previo ? { ...previo, ...patch } : previo));
      },
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => removeWorkout(id), onSuccess: invalidate }),
    addExercise: useMutation({ mutationFn: ({ workoutId, input }: { workoutId: string; input: WorkoutExerciseInput }) => addExercise(workoutId, input), onSuccess: invalidate }),
    updateExercise: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<WorkoutExerciseInput> }) => updateExercise(id, patch),
      /*
       * Se escribe el ejercicio guardado en el detalle en caché, en vez de invalidarlo.
       * Invalidar refetcharía todos los ejercicios y cada tarjeta se reiniciaría con lo del
       * servidor, borrando lo que se esté escribiendo en otra. Pero sin tocar el caché, la
       * duración total del encabezado se quedaba vieja (bug de v1), así que se recalcula aquí.
       */
      onSuccess: (guardado) => {
        queryClient.setQueryData<WorkoutDetail>(workoutKeys.detail(guardado.workout_id), (previo) => {
          if (!previo) return previo;
          const exercises = previo.exercises.map((e) => (e.id === guardado.id ? { ...e, ...guardado } : e));
          // Con hora de fin la duración no depende de los ejercicios (sesión de v2).
          if (previo.ended_at) return { ...previo, exercises };
          const minutos = exercises.reduce((total, e) => total + (e.duration_minutes ?? 0), 0);
          return { ...previo, exercises, duration_minutes: minutos > 0 ? minutos : null };
        });
        void queryClient.invalidateQueries({ queryKey: workoutKeys.names(userId) });
        void queryClient.invalidateQueries({ queryKey: workoutKeys.list(userId) });
      },
    }),
    removeExercise: useMutation({ mutationFn: (id: string) => removeExercise(id), onSuccess: invalidate }),
    /** Series completas de una vez: el borrador del formulario de actividad al guardarse (RF-F9). */
    saveSets: useMutation({ mutationFn: (sets: readonly WorkoutSet[]) => saveWorkoutSets(sets), onSuccess: invalidate }),
    restoreExercise: useMutation({ mutationFn: (id: string) => restoreExercise(id), onSuccess: invalidate }),
    createGroup: useMutation({
      mutationFn: ({ workoutId, input }: { workoutId: string; input: Parameters<typeof createExerciseGroup>[1] }) => createExerciseGroup(workoutId, input),
      onSuccess: invalidate,
    }),
    removeGroup: useMutation({ mutationFn: (groupId: string) => removeExerciseGroup(groupId), onSuccess: invalidate }),
    duplicate: useMutation({
      mutationFn: ({ workoutId, target }: { workoutId: string; target: { activityId: string | null; performedAt: string; keepValues: boolean } }) =>
        duplicateWorkout(uid(), workoutId, target),
      onSuccess: invalidate,
    }),
  };
}
