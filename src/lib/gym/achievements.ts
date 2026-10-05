import { getLanguage, type Language, t } from '@/i18n';
import { isEffective, isLegDay } from '@/lib/gym/muscles';
import { setVolume } from '@/lib/gym/volume';
import type { Trato } from '@/store/gym-store';
import type { Exercise, WorkoutExerciseDetail } from '@/types/domain';

/** Lo que hace falta de una sesión terminada (es un `WorkoutDetail`, sin depender de servicios). */
export type LoggedSession = { id: string; performed_at: string; bodyweight_kg: number | null; exercises: WorkoutExerciseDetail[] };

/**
 * Logros (RF-F57). Se calculan del historial cada vez, no se guardan: editar una sesión
 * pasada (bajar un peso, borrar una serie) los recalcula solo, igual que los PRs.
 */
export type AchievementId =
  | 'drop_royalty'
  | 'myo_maniac'
  | 'leg_day_survivor'
  | 'club_bench'
  | 'club_squat'
  | 'club_deadlift'
  | 'iron_streak'
  | 'early_bird'
  | 'tonnage_titan';

export type Achievement = {
  id: AchievementId;
  title: string;
  description: string;
  progress: number;
  goal: number;
  /** Cómo se lee el progreso: "32 / 50 drops". */
  unit: string;
  unlocked: boolean;
};

/** `family` es la familia del catálogo, que se guarda en español; no es texto de interfaz. */
const CLUBES: { id: AchievementId; family: string; kg: number; lift: 'bench' | 'squat' | 'deadlift' }[] = [
  { id: 'club_bench', family: 'Press plano', kg: 100, lift: 'bench' },
  { id: 'club_squat', family: 'Sentadilla', kg: 140, lift: 'squat' },
  { id: 'club_deadlift', family: 'Peso muerto', kg: 180, lift: 'deadlift' },
];

export function computeAchievements(
  log: readonly LoggedSession[],
  catalog: ReadonlyMap<string, Exercise>,
  bestStreak: number,
  trato: Trato,
  lang: Language = getLanguage(),
): Achievement[] {
  let drops = 0;
  let myo = 0;
  let legDays = 0;
  let madrugadas = 0;
  let tonelaje = 0;
  const maximo = new Map<AchievementId, number>();

  for (const w of log) {
    if (new Date(w.performed_at).getHours() < 6) madrugadas += 1;
    if (isLegDay(w.exercises, catalog)) legDays += 1;
    for (const e of w.exercises) {
      const cat = e.exercise_id ? catalog.get(e.exercise_id) : undefined;
      const ctx = { trackingType: cat?.tracking_type ?? 'weight_reps', bodyweightKg: w.bodyweight_kg };
      const club = cat && cat.equipment.includes('barbell') ? CLUBES.find((c) => c.family === cat.family) : undefined;
      for (const s of e.workout_sets) {
        if (!isEffective(s)) continue;
        tonelaje += setVolume(s, ctx);
        drops += s.segments.filter((g) => g.kind === 'drop').length;
        if (s.segments.some((g) => g.kind === 'myo_activation' || g.kind === 'myo_mini')) myo += 1;
        if (club) {
          const pesado = Math.max(0, ...s.segments.filter((g) => (g.reps ?? 0) >= 1).map((g) => g.weight_kg ?? 0));
          maximo.set(club.id, Math.max(maximo.get(club.id) ?? 0, pesado));
        }
      }
    }
  }

  const a = t(lang).fitness.achievements;
  const u = a.units;
  const logro = (id: AchievementId, title: string, description: string, progress: number, goal: number, unit: string): Achievement => ({
    id,
    title,
    description,
    progress: Math.min(progress, goal),
    goal,
    unit,
    unlocked: progress >= goal,
  });

  return [
    logro('drop_royalty', a.dropRoyalty(a.royalty[trato]), a.dropRoyaltyDesc, drops, 50, u.drops),
    logro('myo_maniac', a.myoManiac, a.myoManiacDesc, myo, 25, u.sets),
    logro('leg_day_survivor', a.legDaySurvivor, a.legDaySurvivorDesc, legDays, 10, u.sessions),
    ...CLUBES.map((c) => logro(c.id, a.club(c.kg), a.clubDesc(c.kg, a.lifts[c.lift]), Math.round(maximo.get(c.id) ?? 0), c.kg, u.kg)),
    logro('iron_streak', a.ironStreak, a.ironStreakDesc, bestStreak, 12, u.weeks),
    logro('early_bird', a.earlyBird, a.earlyBirdDesc, madrugadas, 5, u.sessions),
    logro('tonnage_titan', a.tonnageTitan, a.tonnageTitanDesc, Math.round(tonelaje), 100_000, u.kg),
  ];
}

/** Lo que desbloqueó una sesión: lo que está con ella y no estaba sin ella (RF-F59). */
export function unlockedBy(
  workoutId: string,
  log: readonly LoggedSession[],
  catalog: ReadonlyMap<string, Exercise>,
  bestStreak: number,
  trato: Trato,
  lang: Language = getLanguage(),
): Achievement[] {
  const con = computeAchievements(log, catalog, bestStreak, trato, lang);
  const sin = new Map(computeAchievements(log.filter((w) => w.id !== workoutId), catalog, bestStreak, trato, lang).map((a) => [a.id, a.unlocked]));
  // La racha no depende de una sesión suelta: no se atribuye al resumen.
  return con.filter((a) => a.unlocked && !sin.get(a.id) && a.id !== 'iron_streak');
}
