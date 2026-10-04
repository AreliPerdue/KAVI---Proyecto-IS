import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { systemExercises } from '@/lib/gym/catalog';
import { legacySetsFor } from '@/lib/gym/legacy';
import { buildSearchIndex, matchCatalog } from '@/lib/gym/search';
import { useAuth } from '@/providers';
import { listExercises } from '@/services/exercises';
import {
  getExerciseHistory,
  listLegacyExercises,
  markLegacyConverted,
  saveWorkoutSets,
  updateExercise,
  type ExerciseHistoryEntry,
  type ExerciseRef,
} from '@/services/workouts';

import { exerciseKeys } from './use-exercises';
import { workoutKeys } from './use-workouts';

/** La consulta del historial de un ejercicio, para usarla sola o en lote (`useQueries`). */
export function exerciseHistoryQuery(userId: string | null, ref: ExerciseRef | null) {
  return {
    queryKey: ['workouts', 'history', userId, ref?.exerciseId ?? `nombre:${ref?.name.trim().toLowerCase() ?? ''}`] as const,
    queryFn: () => getExerciseHistory(userId as string, ref as ExerciseRef),
    enabled: !!userId && !!ref && (!!ref.exerciseId || !!ref.name.trim()),
    staleTime: 30_000,
  };
}

/** Historial de un ejercicio (RF-F26): para "Anterior", los PRs y su pantalla de detalle. */
export function useExerciseHistory(ref: ExerciseRef | null) {
  const { userId } = useAuth();
  return useQuery<ExerciseHistoryEntry[]>(exerciseHistoryQuery(userId, ref));
}

/** Una conversión a la vez; si ya hay una en curso, se espera esa en vez de empezar otra. */
let enCurso: Promise<void> | null = null;

/**
 * Convierte el texto libre de v1 en series y liga los nombres al catálogo (RF-F62, RF-F63).
 *
 * Corre en la app, con la sesión de la persona: la RLS aplica y no hace falta una llave de
 * servicio. Es idempotente —los ids de las series salen del ejercicio y su posición, y lo
 * convertido queda marcado—, así que si se corta a la mitad, la siguiente vez termina sin
 * duplicar nada. El texto original no se toca.
 */
export function useLegacyConversion() {
  const { userId } = useAuth();
  const qc = useQueryClient();

  /*
   * Corre cada vez que se monta (Fitness o una sesión). Casi siempre no encuentra nada y
   * es una sola consulta, pero así también convierte lo que se capturó con texto libre
   * desde el formulario de actividad (RF-F9) sin esperar al siguiente arranque.
   */
  useEffect(() => {
    if (!userId || enCurso) return;
    enCurso = (async () => {
      const pendientes = await listLegacyExercises(userId);
      if (pendientes.length === 0) return;

      const series = pendientes.flatMap((e) => legacySetsFor(e, e.performed_at));
      if (series.length > 0) await saveWorkoutSets(series);

      // El catálogo se pide aparte del caché: puede que el selector no se haya abierto nunca.
      const catalogo = await qc.fetchQuery({ queryKey: exerciseKeys.list(userId), queryFn: () => listExercises(userId) }).catch(() => systemExercises());
      const indice = buildSearchIndex(catalogo);
      for (const e of pendientes) {
        if (e.exercise_id) continue;
        const ligado = matchCatalog(e.name, catalogo, indice);
        if (ligado) await updateExercise(e.id, { exercise_id: ligado.id });
      }

      await markLegacyConverted(pendientes.map((e) => e.id));
      await qc.invalidateQueries({ queryKey: workoutKeys.all });
    })()
      // Si falla, se intentará en la siguiente apertura; mientras, el texto de v1 se sigue viendo.
      .catch(() => undefined)
      .finally(() => {
        enCurso = null;
      });
  }, [userId, qc]);
}
