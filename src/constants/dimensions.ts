/** Las 7 dimensiones del bienestar (spec 05). Colores fijos; iconos lucide. */
export type Dimension =
  | 'fisica'
  | 'emocional'
  | 'social'
  | 'intelectual'
  | 'espiritual'
  | 'financiera'
  | 'ocupacional';

export type DimensionInfo = {
  key: Dimension;
  label: string;
  color: string;
  icon: string;
};

export const DIMENSIONS: readonly DimensionInfo[] = [
  { key: 'fisica', label: 'Física', color: '#4CAF50', icon: 'dumbbell' },
  { key: 'emocional', label: 'Emocional', color: '#E91E63', icon: 'heart' },
  { key: 'social', label: 'Social', color: '#FF9800', icon: 'users' },
  { key: 'intelectual', label: 'Intelectual', color: '#2196F3', icon: 'book-open' },
  { key: 'espiritual', label: 'Espiritual', color: '#9C27B0', icon: 'sparkles' },
  { key: 'financiera', label: 'Financiera', color: '#009688', icon: 'wallet' },
  { key: 'ocupacional', label: 'Ocupacional', color: '#607D8B', icon: 'briefcase' },
] as const;

export const DIMENSION_BY_KEY: Record<Dimension, DimensionInfo> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d]),
) as Record<Dimension, DimensionInfo>;
