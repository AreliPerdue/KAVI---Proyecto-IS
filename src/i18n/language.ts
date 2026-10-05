/**
 * Idioma activo de la interfaz (spec 12). Vive en un módulo, como el formato de hora en
 * `lib/dates`: lo leen funciones puras que formatean fechas desde decenas de sitios, y pasarlo
 * por props sería frágil. Los componentes se enteran del cambio con `useLanguage()`.
 */
export type Language = 'es' | 'en';
export type LanguagePreference = 'system' | Language;

/**
 * Solo para pruebas: lo que "el sistema" dice, para no depender del idioma de la computadora.
 * Va en un global porque las pruebas recargan los módulos (`jest.resetModules`).
 */
const fijoEnPruebas = () => (globalThis as { __KAVI_SYSTEM_LANGUAGE__?: Language }).__KAVI_SYSTEM_LANGUAGE__;

/** Español si el teléfono o el navegador está en cualquier variante de español; si no, inglés (RF-I1). */
export function systemLanguage(): Language {
  const fijo = fijoEnPruebas();
  if (fijo) return fijo;
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

let actual: Language = systemLanguage();
const oyentes = new Set<() => void>();

export function getLanguage(): Language {
  return actual;
}

export function resolveLanguage(pref: LanguagePreference): Language {
  return pref === 'system' ? systemLanguage() : pref;
}

export function setLanguage(idioma: Language): void {
  if (idioma === actual) return;
  actual = idioma;
  oyentes.forEach((f) => f());
}

export function subscribeLanguage(f: () => void): () => void {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
}

/** Locale de `Intl` para números y fechas sueltas, según el idioma de la interfaz. */
export function intlLocale(lang: Language = getLanguage()): string {
  return lang === 'en' ? 'en-US' : 'es-MX';
}

/** Un número con separadores de miles en el idioma de la interfaz. */
export function formatNumber(n: number, lang: Language = getLanguage(), options?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(intlLocale(lang), options);
}
