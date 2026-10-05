import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useLanguage } from '@/i18n';
import { computeAchievements, type Achievement } from '@/lib/gym/achievements';
import { computeStreak, type StreakState } from '@/lib/gym/streak';
import { useAuth } from '@/providers';
import { getTrainingLog, listStreakEvents, saveStreakEvents, type WorkoutDetail } from '@/services/workouts';
import { useGymStore } from '@/store/gym-store';
import type { Exercise, StreakEvent } from '@/types/domain';

import { useExercises } from './use-exercises';

export const progressKeys = {
  log: (userId: string | null) => ['workouts', 'log', userId] as const,
  streak: (userId: string | null) => ['workouts', 'streak', userId] as const,
};

/** Sesiones terminadas con su detalle, de la más vieja a la más reciente (RF-F57 – RF-F60). */
export function useTrainingLog() {
  const { userId } = useAuth();
  return useQuery<WorkoutDetail[]>({ queryKey: progressKeys.log(userId), queryFn: () => getTrainingLog(userId as string), enabled: !!userId, staleTime: 30_000 });
}

export function useStreakEvents() {
  const { userId } = useAuth();
  return useQuery<StreakEvent[]>({ queryKey: progressKeys.streak(userId), queryFn: () => listStreakEvents(userId as string), enabled: !!userId });
}

/**
 * Racha de Hierro y logros, calculados juntos porque el logro de racha usa la mejor racha.
 * `now` se fija al montar: la semana no cambia mientras la pantalla está abierta.
 */
export function useGymProgress() {
  const log = useTrainingLog();
  const events = useStreakEvents();
  const catalogo = useExercises();
  const trato = useGymStore((s) => s.trato);
  const lang = useLanguage();
  const [ahora] = useState(() => new Date());

  const catalog = useMemo(() => new Map<string, Exercise>((catalogo.data ?? []).map((e) => [e.id, e])), [catalogo.data]);
  /**
   * Las sesiones que de verdad pasaron. Un plan del formulario de actividad (RF-F9) se
   * guarda como sesión con series sin marcar: no cuenta mientras no llegue su hora ni si
   * nunca se marcó nada. Las de v1 sin series estructuradas sí cuentan.
   */
  const sessions = useMemo(
    () =>
      (log.data ?? []).filter((w) => {
        if (new Date(w.performed_at) > ahora) return false;
        const series = w.exercises.flatMap((e) => e.workout_sets);
        return series.length === 0 || series.some((s) => s.completed_at !== null);
      }),
    [log.data, ahora],
  );
  const streak = useMemo<StreakState | null>(() => {
    if (!log.data || !events.data) return null;
    return computeStreak(sessions.map((w) => new Date(w.performed_at)), events.data, ahora);
  }, [log.data, sessions, events.data, ahora]);
  const achievements = useMemo<Achievement[] | null>(() => {
    if (!log.data || !streak) return null;
    return computeAchievements(sessions, catalog, streak.best, trato, lang);
  }, [log.data, sessions, catalog, streak, trato, lang]);

  return {
    log,
    sessions,
    events,
    catalog,
    streak,
    achievements,
    now: ahora,
    isPending: log.isPending || events.isPending,
    isError: log.isError || events.isError,
    error: log.error ?? events.error,
  };
}

/** "Mi racha sigue" o "Reiniciar racha" para todas las semanas de un hueco (RF-F58). */
export function useStreakDecision() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ weeks, decision, note, reasons }: { weeks: readonly string[]; decision: StreakEvent['decision']; note: string | null; reasons: string[] }) =>
      saveStreakEvents(
        userId as string,
        weeks.map((week_start) => ({ week_start, decision, note, reasons })),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: progressKeys.streak(userId) }),
  });
}
