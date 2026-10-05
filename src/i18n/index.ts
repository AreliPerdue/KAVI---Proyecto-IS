import { useSyncExternalStore } from 'react';

import { en } from './en';
import { es } from './es';
import { getLanguage, type Language, subscribeLanguage } from './language';
import type { Dictionary } from './types';

export * from './language';
export type { Dictionary } from './types';

const DICCIONARIOS: Record<Language, Dictionary> = { es, en };

/** Fuera de React (servicios, `lib/`): el diccionario del idioma activo, o del que se pida. */
export function t(lang: Language = getLanguage()): Dictionary {
  return DICCIONARIOS[lang];
}

/** El idioma activo; el componente se repinta cuando cambia (RF-I2). */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

/** Textos de la interfaz en el idioma activo (spec 12). */
export function useT(): Dictionary {
  return DICCIONARIOS[useLanguage()];
}
