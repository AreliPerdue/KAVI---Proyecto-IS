/**
 * Glosario de fitness (RF-F64). El español sale de `constants/glossary`, que además guarda
 * el orden y el tema de cada término; aquí solo se indexa por id para que el inglés tenga la
 * misma forma.
 */
import { GLOSSARY, GLOSSARY_TOPICS, type GlossaryTopic } from '@/constants/glossary';

export type GlossaryText = { term: string; also?: string; meaning: string; example: string; short: string };

export const glossary = {
  title: 'Glosario',
  intro: 'Lo que significa cada término del gimnasio, con un ejemplo. No necesitas saberlos para entrenar: aquí están por si te topas con uno.',
  searchPlaceholder: 'RIR, drop set, superserie…',
  searchA11y: 'Buscar en el glosario',
  clearSearch: 'Limpiar búsqueda',
  noMatch: 'Ningún término dice eso.',
  example: 'Ejemplo',
  alsoKnownAs: (otros: string) => `También: ${otros}`,
  seeAll: 'Ver todo el glosario',
  topics: Object.fromEntries(GLOSSARY_TOPICS.map((t) => [t.id, t.label])) as Record<GlossaryTopic, string>,
  entries: Object.fromEntries(
    GLOSSARY.map(({ id, term, also, meaning, example, short }) => [id, { term, also, meaning, example, short }]),
  ) as Record<string, GlossaryText>,
};
