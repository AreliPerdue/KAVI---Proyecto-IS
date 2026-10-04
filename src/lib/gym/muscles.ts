import type { Muscle } from '@/constants/exercise-catalog';
import type { Exercise, WorkoutExerciseDetail } from '@/types/domain';

/**
 * Grupos musculares para el volumen semanal (RF-F60). El catálogo distingue cabezas y
 * porciones (pecho superior, tríceps largo…); para contar series por semana basta con el
 * grupo, que es como se programa.
 */
export const MUSCLE_GROUPS: { key: string; label: string; muscles: Muscle[]; legs?: boolean }[] = [
  { key: 'chest', label: 'Pecho', muscles: ['chest_upper', 'chest_mid', 'chest_lower'] },
  { key: 'back', label: 'Espalda', muscles: ['lats', 'traps_upper', 'traps_mid', 'rhomboids', 'erectors'] },
  { key: 'shoulders', label: 'Hombro', muscles: ['delts_front', 'delts_side', 'delts_rear', 'rotator_cuff'] },
  { key: 'biceps', label: 'Bíceps', muscles: ['biceps', 'brachialis', 'brachioradialis'] },
  { key: 'triceps', label: 'Tríceps', muscles: ['triceps_long', 'triceps_lateral', 'triceps_medial'] },
  { key: 'forearms', label: 'Antebrazo', muscles: ['forearm_flexors', 'forearm_extensors'] },
  { key: 'quads', label: 'Cuádriceps', muscles: ['quads'], legs: true },
  { key: 'hamstrings', label: 'Isquiotibiales', muscles: ['hamstrings'], legs: true },
  { key: 'glutes', label: 'Glúteo', muscles: ['glutes_max', 'glutes_med'], legs: true },
  { key: 'adductors', label: 'Aductores', muscles: ['adductors'], legs: true },
  { key: 'calves', label: 'Pantorrilla', muscles: ['calves_gastroc', 'calves_soleus', 'tibialis'], legs: true },
  { key: 'core', label: 'Core', muscles: ['abs', 'obliques', 'transverse_abs'] },
];

const GRUPO_DE = new Map<string, string>(MUSCLE_GROUPS.flatMap((g) => g.muscles.map((m) => [m, g.key] as const)));
/** Grupo de un músculo del catálogo ("chest_upper" → "chest"); `undefined` si no está en ninguno. */
export const muscleGroupOf = (muscle: string): string | undefined => GRUPO_DE.get(muscle);

const PIERNA = new Set(MUSCLE_GROUPS.filter((g) => g.legs).map((g) => g.key));

/** Zonas de referencia en series efectivas por semana: orientación, no receta. */
export const WEEKLY_ZONES = { low: 10, high: 20 } as const;

/**
 * Cuánto cuenta una serie para cada grupo: 1 si el grupo es primario, ½ si solo es
 * secundario. Una serie nunca cuenta dos veces para el mismo grupo.
 */
export function setContribution(exercise: Pick<Exercise, 'primary_muscles' | 'secondary_muscles'>): Map<string, number> {
  const m = new Map<string, number>();
  for (const mus of exercise.secondary_muscles) {
    const g = GRUPO_DE.get(mus);
    if (g) m.set(g, 0.5);
  }
  for (const mus of exercise.primary_muscles) {
    const g = GRUPO_DE.get(mus);
    if (g) m.set(g, 1);
  }
  return m;
}

/** Series efectivas: hechas y que no son calentamiento. */
export const isEffective = (s: { completed_at: string | null; set_type: string }) => s.completed_at !== null && s.set_type !== 'warmup';

/** Series efectivas por grupo de un conjunto de ejercicios (una sesión o una semana). */
export function setsByGroup(exercises: readonly WorkoutExerciseDetail[], catalog: ReadonlyMap<string, Exercise>): Map<string, number> {
  const total = new Map<string, number>();
  for (const e of exercises) {
    const cat = e.exercise_id ? catalog.get(e.exercise_id) : undefined;
    if (!cat) continue;
    const n = e.workout_sets.filter(isEffective).length;
    if (n === 0) continue;
    for (const [g, peso] of setContribution(cat)) total.set(g, (total.get(g) ?? 0) + peso * n);
  }
  return total;
}

/** Grupos trabajados como primarios en la sesión, para el resumen (RF-F59). */
export function musclesWorked(exercises: readonly WorkoutExerciseDetail[], catalog: ReadonlyMap<string, Exercise>): string[] {
  const porGrupo = setsByGroup(exercises, catalog);
  return MUSCLE_GROUPS.filter((g) => (porGrupo.get(g.key) ?? 0) >= 1).map((g) => g.label);
}

/** Leg day: al menos 6 series efectivas de pierna como músculo primario (logro y microcopy). */
export function isLegDay(exercises: readonly WorkoutExerciseDetail[], catalog: ReadonlyMap<string, Exercise>): boolean {
  let series = 0;
  for (const e of exercises) {
    const cat = e.exercise_id ? catalog.get(e.exercise_id) : undefined;
    if (!cat || !cat.primary_muscles.some((m) => PIERNA.has(GRUPO_DE.get(m) ?? ''))) continue;
    series += e.workout_sets.filter(isEffective).length;
  }
  return series >= 6;
}
