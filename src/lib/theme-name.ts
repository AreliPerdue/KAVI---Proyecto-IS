import type { Dimension } from '@/constants/dimensions';
import { getLanguage, type Language, t } from '@/i18n';

/** Prefijo de los ids fijos de los temas del sistema (`constants/themes.ts`). */
const PREFIJO_SISTEMA = '00000000-0000-4000-8000-0000000000';

/**
 * El nombre que se muestra de un tema (spec 12, RF-I4 y RF-I5). Los del sistema vienen de la base
 * en español y se traducen por su id fijo; los que creó la persona se ven tal cual. En componentes
 * pásale el idioma (`useLanguage()`) para que el React Compiler repinte al cambiarlo.
 */
export function themeName(theme: { id: string; name: string }, lang: Language = getLanguage()): string {
  if (!theme.id.startsWith(PREFIJO_SISTEMA)) return theme.name;
  const clave = theme.id.slice(PREFIJO_SISTEMA.length);
  // Un tema del sistema que la persona renombró ya es suyo: se ve como lo escribió.
  if (theme.name !== t('es').themes.system[clave]) return theme.name;
  return t(lang).themes.system[clave] ?? theme.name;
}

/** El nombre de una dimensión en el idioma activo (o el indicado). */
export function dimensionName(dimension: Dimension, lang: Language = getLanguage()): string {
  return t(lang).themes.dimensions[dimension];
}
