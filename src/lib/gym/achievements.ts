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

const CLUBES: { id: AchievementId; family: string; kg: number; lift: string }[] = [
  { id: 'club_bench', family: 'Press plano', kg: 100, lift: 'press de banca' },
  { id: 'club_squat', family: 'Sentadilla', kg: 140, lift: 'sentadilla' },
  { id: 'club_deadlift', family: 'Peso muerto', kg: 180, lift: 'peso muerto' },
];

export function computeAchievements(log: readonly LoggedSession[], catalog: ReadonlyMap<string, Exercise>, bestStreak: number, trato: Trato): Achievement[] {
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

  const realeza = trato === 'rey' ? 'Rey' : trato === 'reina' ? 'Reina' : 'Realeza';
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
    logro('drop_royalty', `${realeza} del Drop Set`, '50 drops completados.', drops, 50, 'drops'),
    logro('myo_maniac', 'Myo-maníaco', '25 series de myo-reps.', myo, 25, 'series'),
    logro('leg_day_survivor', 'Leg Day Survivor', '10 sesiones de pierna (6 series de pierna o más).', legDays, 10, 'sesiones'),
    ...CLUBES.map((c) => logro(c.id, `Club ${c.kg} kg`, `${c.kg} kg en ${c.lift} con barra, al menos una rep.`, Math.round(maximo.get(c.id) ?? 0), c.kg, 'kg')),
    logro('iron_streak', 'Racha de Hierro', '12 semanas seguidas con al menos un entreno.', bestStreak, 12, 'semanas'),
    logro('early_bird', 'Madrugador', '5 sesiones empezadas antes de las 6 a. m.', madrugadas, 5, 'sesiones'),
    logro('tonnage_titan', 'Titán del Tonelaje', '100,000 kg movidos en total.', Math.round(tonelaje), 100_000, 'kg'),
  ];
}

/** Lo que desbloqueó una sesión: lo que está con ella y no estaba sin ella (RF-F59). */
export function unlockedBy(workoutId: string, log: readonly LoggedSession[], catalog: ReadonlyMap<string, Exercise>, bestStreak: number, trato: Trato): Achievement[] {
  const con = computeAchievements(log, catalog, bestStreak, trato);
  const sin = new Map(computeAchievements(log.filter((w) => w.id !== workoutId), catalog, bestStreak, trato).map((a) => [a.id, a.unlocked]));
  // La racha no depende de una sesión suelta: no se atribuye al resumen.
  return con.filter((a) => a.unlocked && !sin.get(a.id) && a.id !== 'iron_streak');
}
