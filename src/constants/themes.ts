import type { Theme } from '@/types/domain';
import { DIMENSION_BY_KEY } from '@/constants/dimensions';

type SystemThemeSeed = Pick<Theme, 'id' | 'name' | 'dimension' | 'icon'>;

const SEEDS: SystemThemeSeed[] = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Gimnasio', dimension: 'fisica', icon: 'dumbbell' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Caminata/Correr', dimension: 'fisica', icon: 'footprints' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Deporte', dimension: 'fisica', icon: 'trophy' },
  { id: '00000000-0000-4000-8000-000000000004', name: 'Cita médica', dimension: 'fisica', icon: 'stethoscope' },
  { id: '00000000-0000-4000-8000-000000000005', name: 'Descanso', dimension: 'emocional', icon: 'moon' },
  { id: '00000000-0000-4000-8000-000000000006', name: 'Journaling/Terapia', dimension: 'emocional', icon: 'notebook-pen' },
  { id: '00000000-0000-4000-8000-000000000007', name: 'Familia', dimension: 'social', icon: 'house-heart' },
  { id: '00000000-0000-4000-8000-000000000008', name: 'Amigos', dimension: 'social', icon: 'users' },
  { id: '00000000-0000-4000-8000-000000000009', name: 'Cita/Pareja', dimension: 'social', icon: 'heart' },
  { id: '00000000-0000-4000-8000-000000000010', name: 'Estudio', dimension: 'intelectual', icon: 'graduation-cap' },
  { id: '00000000-0000-4000-8000-000000000011', name: 'Lectura', dimension: 'intelectual', icon: 'book-open' },
  { id: '00000000-0000-4000-8000-000000000012', name: 'Curso/Clase', dimension: 'intelectual', icon: 'school' },
  { id: '00000000-0000-4000-8000-000000000013', name: 'Meditación', dimension: 'espiritual', icon: 'flower-2' },
  { id: '00000000-0000-4000-8000-000000000014', name: 'Iglesia/Práctica', dimension: 'espiritual', icon: 'church' },
  { id: '00000000-0000-4000-8000-000000000015', name: 'Finanzas/Pagos', dimension: 'financiera', icon: 'wallet' },
  { id: '00000000-0000-4000-8000-000000000016', name: 'Presupuesto', dimension: 'financiera', icon: 'calculator' },
  { id: '00000000-0000-4000-8000-000000000017', name: 'Trabajo', dimension: 'ocupacional', icon: 'briefcase' },
  { id: '00000000-0000-4000-8000-000000000018', name: 'Junta/Reunión', dimension: 'ocupacional', icon: 'video' },
  { id: '00000000-0000-4000-8000-000000000019', name: 'Proyecto personal', dimension: 'ocupacional', icon: 'rocket' },
];

/**
 * Temas del sistema (spec 05). El color viene de su dimensión.
 * Los UUID son fijos y coinciden con el seed de `20260919000100_themes.sql`, para que
 * el id de un tema signifique lo mismo en el backend demo y en el real.
 */
export const SYSTEM_THEMES: readonly Theme[] = SEEDS.map((seed) => ({
  ...seed,
  color: DIMENSION_BY_KEY[seed.dimension].color,
  is_system: true,
  owner_id: null,
}));

/** Tema Gimnasio: enciende el módulo fitness (RF-T4). Mismo UUID que el seed SQL. */
export const GYM_THEME_ID = '00000000-0000-4000-8000-000000000001';
