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
  /** El nombre visible sale del diccionario: `dimensionName(key)` (spec 12). */
  color: string;
  icon: string;
};

export const DIMENSIONS: readonly DimensionInfo[] = [
  { key: 'fisica', color: '#4CAF50', icon: 'dumbbell' },
  { key: 'emocional', color: '#E91E63', icon: 'heart' },
  { key: 'social', color: '#FF9800', icon: 'users' },
  { key: 'intelectual', color: '#2196F3', icon: 'book-open' },
  { key: 'espiritual', color: '#9C27B0', icon: 'sparkles' },
  { key: 'financiera', color: '#009688', icon: 'wallet' },
  { key: 'ocupacional', color: '#607D8B', icon: 'briefcase' },
] as const;

export const DIMENSION_BY_KEY: Record<Dimension, DimensionInfo> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d]),
) as Record<Dimension, DimensionInfo>;
