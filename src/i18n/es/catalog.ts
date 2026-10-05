/** Taxonomía del catálogo de ejercicios (spec 07, RF-F20). El español sale de `constants/exercise-catalog`. */
import { EQUIPMENT, MUSCLES, PATTERNS, TRACKING_TYPES } from '@/constants/exercise-catalog';

export const catalog = {
  muscles: MUSCLES as Record<string, string>,
  equipment: EQUIPMENT as Record<string, string>,
  patterns: PATTERNS as Record<string, string>,
  tracking: TRACKING_TYPES as Record<string, string>,
};
