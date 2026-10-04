import { buildCatalog } from '@/constants/exercise-catalog';
import type { Exercise } from '@/types/domain';

import { uuidFrom } from './ids';

/** El id de un ejercicio del sistema sale de su slug: es el mismo en demo y en la base. */
export const systemExerciseId = (slug: string) => uuidFrom(`exercise:${slug}`);

/**
 * El catálogo del sistema con la forma del dominio, como lo devolvería la base después de
 * la migración `exercise_catalog` (que se genera del mismo archivo).
 */
export function systemExercises(): Exercise[] {
  return buildCatalog().map((e) => ({
    id: systemExerciseId(e.slug),
    slug: e.slug,
    name_es: e.name_es,
    name_en: e.name_en,
    aliases: e.aliases,
    family: e.family,
    primary_muscles: e.primary_muscles,
    secondary_muscles: e.secondary_muscles,
    equipment: e.equipment,
    movement_pattern: e.movement_pattern,
    mechanic: e.mechanic,
    laterality: e.laterality,
    tracking_type: e.tracking_type,
    created_by: null,
    archived_at: null,
  }));
}
