import type { Theme } from '@/types/domain';
import { DIMENSION_BY_KEY } from '@/constants/dimensions';

type SystemThemeSeed = Pick<Theme, 'id' | 'name' | 'dimension' | 'icon'>;

const SEEDS: SystemThemeSeed[] = [
  { id: 'sys-gimnasio', name: 'Gimnasio', dimension: 'fisica', icon: 'dumbbell' },
  { id: 'sys-caminata', name: 'Caminata/Correr', dimension: 'fisica', icon: 'footprints' },
  { id: 'sys-deporte', name: 'Deporte', dimension: 'fisica', icon: 'trophy' },
  { id: 'sys-cita-medica', name: 'Cita médica', dimension: 'fisica', icon: 'stethoscope' },
  { id: 'sys-descanso', name: 'Descanso', dimension: 'emocional', icon: 'moon' },
  { id: 'sys-journaling', name: 'Journaling/Terapia', dimension: 'emocional', icon: 'notebook-pen' },
  { id: 'sys-familia', name: 'Familia', dimension: 'social', icon: 'house-heart' },
  { id: 'sys-amigos', name: 'Amigos', dimension: 'social', icon: 'users' },
  { id: 'sys-pareja', name: 'Cita/Pareja', dimension: 'social', icon: 'heart' },
  { id: 'sys-estudio', name: 'Estudio', dimension: 'intelectual', icon: 'graduation-cap' },
  { id: 'sys-lectura', name: 'Lectura', dimension: 'intelectual', icon: 'book-open' },
  { id: 'sys-curso', name: 'Curso/Clase', dimension: 'intelectual', icon: 'school' },
  { id: 'sys-meditacion', name: 'Meditación', dimension: 'espiritual', icon: 'flower-2' },
  { id: 'sys-iglesia', name: 'Iglesia/Práctica', dimension: 'espiritual', icon: 'church' },
  { id: 'sys-finanzas', name: 'Finanzas/Pagos', dimension: 'financiera', icon: 'wallet' },
  { id: 'sys-presupuesto', name: 'Presupuesto', dimension: 'financiera', icon: 'calculator' },
  { id: 'sys-trabajo', name: 'Trabajo', dimension: 'ocupacional', icon: 'briefcase' },
  { id: 'sys-junta', name: 'Junta/Reunión', dimension: 'ocupacional', icon: 'video' },
  { id: 'sys-proyecto', name: 'Proyecto personal', dimension: 'ocupacional', icon: 'rocket' },
];

/** Temas del sistema (spec 05). El color viene de su dimensión. */
export const SYSTEM_THEMES: readonly Theme[] = SEEDS.map((seed) => ({
  ...seed,
  color: DIMENSION_BY_KEY[seed.dimension].color,
  is_system: true,
  owner_id: null,
}));

export const GYM_THEME_ID = 'sys-gimnasio';
