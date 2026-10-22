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
  /** Su color en el modo daltonismo (RF-T8): la paleta "bright" de Paul Tol, que conserva el tono de cada una. */
  colorblind: string;
  icon: string;
};

export const DIMENSIONS: readonly DimensionInfo[] = [
  { key: 'fisica', color: '#4CAF50', colorblind: '#228833', icon: 'dumbbell' },
  { key: 'emocional', color: '#E91E63', colorblind: '#EE6677', icon: 'heart' },
  { key: 'social', color: '#FF9800', colorblind: '#CCBB44', icon: 'users' },
  { key: 'intelectual', color: '#2196F3', colorblind: '#4477AA', icon: 'book-open' },
  { key: 'espiritual', color: '#9C27B0', colorblind: '#AA3377', icon: 'sparkles' },
  { key: 'financiera', color: '#009688', colorblind: '#66CCEE', icon: 'wallet' },
  { key: 'ocupacional', color: '#607D8B', colorblind: '#BBBBBB', icon: 'briefcase' },
] as const;

export const DIMENSION_BY_KEY: Record<Dimension, DimensionInfo> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d]),
) as Record<Dimension, DimensionInfo>;

/** El color con que se pinta una dimensión: el suyo o, con el modo daltonismo, el de la paleta segura (RF-T8). */
export function dimensionColor(key: Dimension, colorblind: boolean): string {
  const d = DIMENSION_BY_KEY[key];
  return colorblind ? d.colorblind : d.color;
}
