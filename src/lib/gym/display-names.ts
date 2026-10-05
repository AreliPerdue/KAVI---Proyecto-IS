import { getLanguage, type Language, t } from '@/i18n';
import type { Exercise } from '@/types/domain';

/*
 * Nombres que se muestran en Fitness según el idioma (spec 12, RF-I4 y RF-I5). En componentes,
 * pásales el idioma (`useLanguage()`) para que el React Compiler repinte al cambiarlo.
 */

/** El nombre de un ejercicio del catálogo; los personalizados no tienen inglés y se ven como se escribieron. */
export function exerciseName(ex: Pick<Exercise, 'name_es' | 'name_en'>, lang: Language = getLanguage()): string {
  return lang === 'en' && ex.name_en ? ex.name_en : ex.name_es;
}

/**
 * El nombre de un ejercicio dentro de un entrenamiento. La sesión guarda una copia del nombre en
 * español de cuando se agregó; si sigue siendo el del catálogo se muestra en el idioma activo, y si
 * la persona lo cambió, como lo escribió.
 */
export function workoutExerciseName(
  guardado: string,
  catalogo: Pick<Exercise, 'name_es' | 'name_en'> | null | undefined,
  lang: Language = getLanguage(),
): string {
  if (catalogo && guardado === catalogo.name_es) return exerciseName(catalogo, lang);
  return guardado;
}

const etiqueta = (mapa: Record<string, string>, clave: string) => mapa[clave] ?? clave;

export function muscleName(clave: string, lang: Language = getLanguage()): string {
  return etiqueta(t(lang).catalog.muscles, clave);
}

export function equipmentName(clave: string, lang: Language = getLanguage()): string {
  return etiqueta(t(lang).catalog.equipment, clave);
}

export function patternName(clave: string, lang: Language = getLanguage()): string {
  return etiqueta(t(lang).catalog.patterns, clave);
}

export function trackingName(clave: string, lang: Language = getLanguage()): string {
  return etiqueta(t(lang).catalog.tracking, clave);
}

/** Términos de entrenamiento por su clave (diccionario `training`); una clave desconocida se ve tal cual. */
const termino = (mapa: Record<string, { label: string } | undefined>, clave: string) => mapa[clave]?.label ?? clave;

export function intensifierLabel(clave: string, lang: Language = getLanguage()): string {
  return termino(t(lang).training.intensifiers, clave);
}

export function setTypeLabel(clave: string, lang: Language = getLanguage()): string {
  return termino(t(lang).training.setTypes, clave);
}

export function setTypeDescription(clave: string, lang: Language = getLanguage()): string {
  return (t(lang).training.setTypes as Record<string, { description: string } | undefined>)[clave]?.description ?? '';
}

export function groupTypeLabel(clave: string, lang: Language = getLanguage()): string {
  return termino(t(lang).training.groups, clave);
}

export function protocolLabel(clave: string, lang: Language = getLanguage()): string {
  return termino(t(lang).training.protocols, clave);
}

export function gearLabel(clave: string, lang: Language = getLanguage()): string {
  return etiqueta(t(lang).training.gear, clave);
}

export function tagLabel(clave: string, lang: Language = getLanguage()): string {
  return etiqueta(t(lang).training.tags, clave);
}

export function segmentName(clave: string, lang: Language = getLanguage()): string {
  return etiqueta(t(lang).training.segments, clave);
}
