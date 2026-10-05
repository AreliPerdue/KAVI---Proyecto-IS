import { GLOSSARY, type GlossaryEntry } from '@/constants/glossary';
import { getLanguage, type Language, t } from '@/i18n';

/**
 * El glosario en el idioma activo (spec 12, RF-I5). El orden y el tema salen de
 * `constants/glossary`; los textos, del diccionario `glossary`. Un término sin traducción
 * se queda en español en vez de desaparecer.
 */
export function glossaryEntries(lang: Language = getLanguage()): GlossaryEntry[] {
  const textos = t(lang).glossary.entries;
  return GLOSSARY.map((e) => {
    const x = textos[e.id];
    return x ? { ...e, ...x, also: x.also } : e;
  });
}

export function localizedGlossaryEntry(id: string, lang: Language = getLanguage()): GlossaryEntry | undefined {
  return glossaryEntries(lang).find((e) => e.id === id);
}
