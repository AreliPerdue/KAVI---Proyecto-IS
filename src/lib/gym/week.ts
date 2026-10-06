import { addWeeks } from 'date-fns';

import type { LoggedSession } from '@/lib/gym/achievements';
import { isEffective, setsByGroup } from '@/lib/gym/muscles';
import { weekStart } from '@/lib/gym/streak';
import { setVolume } from '@/lib/gym/volume';
import type { Exercise } from '@/types/domain';

export type WeekSummary = {
  /** Sesiones de esta semana (lunes a domingo). */
  sessions: number;
  /** Volumen efectivo de la semana, en kg. */
  volumeKg: number;
  /** Los grupos con más series efectivas, de más a menos (RF-F60). */
  topGroups: { key: string; sets: number }[];
};

/**
 * Lo de "esta semana" para el bento de Fitness (spec 07, RF-F66). Se calcula del historial cada
 * vez, como los PRs y la racha: editar una sesión lo corrige solo.
 */
export function weekSummary(
  sessions: readonly LoggedSession[],
  catalog: ReadonlyMap<string, Exercise>,
  now: Date,
  top = 3,
): WeekSummary {
  const desde = weekStart(now).getTime();
  const hasta = addWeeks(weekStart(now), 1).getTime();
  const semana = sessions.filter((w) => {
    const t = new Date(w.performed_at).getTime();
    return t >= desde && t < hasta;
  });

  let volumeKg = 0;
  for (const w of semana) {
    for (const e of w.exercises) {
      const cat = e.exercise_id ? catalog.get(e.exercise_id) : undefined;
      const ctx = { trackingType: cat?.tracking_type ?? 'weight_reps', bodyweightKg: w.bodyweight_kg } as const;
      for (const s of e.workout_sets) if (isEffective(s)) volumeKg += setVolume(s, ctx);
    }
  }

  const porGrupo = setsByGroup(
    semana.flatMap((w) => w.exercises),
    catalog,
  );
  const topGroups = [...porGrupo.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([key, sets]) => ({ key, sets }));

  return { sessions: semana.length, volumeKg, topGroups };
}
