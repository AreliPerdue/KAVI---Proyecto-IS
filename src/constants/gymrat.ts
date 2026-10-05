import { getLanguage, type Language } from '@/i18n/language';
import type { Trato } from '@/store/gym-store';

/**
 * Modo Gymrat (spec 07 v2, §8). Todo el humor vive aquí: si "Modo serio" está prendido,
 * nada de esto se muestra (RF-F54).
 *
 * Una frase es texto con `{voc}` (", mi rey", ", mi reina" o nada) o, cuando la gramática
 * cambia con el trato, una variante por trato (RF-F55).
 *
 * El inglés (spec 12) no traduce palabra por palabra: busca el mismo chiste con el mismo
 * tono, y "mi rey" / "mi reina" pasan a "king" / "queen".
 */
type Frase = string | Record<Trato, string>;

export type GymratEvent = 'pr' | 'drop' | 'myo' | 'rest_end' | 'leg_day' | 'no_legs' | 'session_done';

const FRASES_ES: Record<GymratEvent, Frase[]> = {
  pr: [
    '¡PR{voc}! Eso no lo levanta cualquiera. 👑',
    'Récord nuevo. El de la vez pasada ya te tiene miedo.',
    '¡PR! Anótalo en tu biografía.',
    { rey: 'Nuevo récord. Así se gobierna, mi rey.', reina: 'Nuevo récord. Así se gobierna, mi reina.', neutral: 'Nuevo récord. Así se hace.' },
  ],
  drop: ['Ese músculo ya pidió su liquidación.', 'Drop set terminado. Bajaste el peso, no el nivel.', 'Hasta la última gota{voc}.'],
  myo: ['Mini-series, máximo sufrimiento.', 'Myo-reps: poquitas reps, muchísimas ganas de llorar.', 'Respira, tres reps más. Y otra vez.'],
  rest_end: ['Se acabó el descanso, suelta el cel 👀', 'Descanso terminado. La barra no se va a levantar sola.', 'Arriba{voc}, que se enfría el músculo.'],
  leg_day: [
    'Sobreviviste al leg day. Las escaleras te odian.',
    'Pierna terminada. Mañana sentarte va a ser un deporte.',
    { rey: 'Leg day completo. Un rey no se salta la pierna.', reina: 'Leg day completo. Una reina no se salta la pierna.', neutral: 'Leg day completo. Nadie te puede decir nada.' },
  ],
  no_legs: [
    { rey: 'Bro… ¿y la pierna?', reina: 'Amiga… ¿y la pierna?', neutral: 'Oye… ¿y la pierna?' },
    'Más de una semana sin pierna. Las sentadillas te extrañan.',
  ],
  session_done: [
    'Listo{voc}. A comer y a dormir, que ahí se crece.',
    'Hoy le ganaste a la versión que se quedó en el sillón.',
    'El sillón te espera. Te lo ganaste.',
  ],
};

const FRASES_EN: Record<GymratEvent, Frase[]> = {
  pr: [
    'PR{voc}! Not just anyone lifts that. 👑',
    'New record. Last time’s you is shaking right now.',
    'PR! Put that in your bio.',
    { rey: 'New record. That’s how you rule, king.', reina: 'New record. That’s how you rule, queen.', neutral: 'New record. That’s how it’s done.' },
  ],
  drop: ['That muscle just handed in its resignation.', 'Drop set done. You dropped the weight, not the standard.', 'Down to the last drop{voc}.'],
  myo: ['Mini-sets, maximum suffering.', 'Myo-reps: tiny reps, huge urge to cry.', 'Breathe, three more reps. And again.'],
  rest_end: ['Rest is over, put the phone down 👀', 'Rest done. The bar won’t lift itself.', 'Up you go{voc}, your muscles are cooling off.'],
  leg_day: [
    'You survived leg day. The stairs hate you now.',
    'Legs done. Sitting down tomorrow will be a sport.',
    { rey: 'Leg day done. A king never skips legs.', reina: 'Leg day done. A queen never skips legs.', neutral: 'Leg day done. Nobody can say a thing.' },
  ],
  no_legs: [
    { rey: 'Bro… what about legs?', reina: 'Girl… what about legs?', neutral: 'Hey… what about legs?' },
    'Over a week without legs. The squats miss you.',
  ],
  session_done: [
    'Done{voc}. Now eat and sleep, that’s where you grow.',
    'Today you beat the version of you that stayed on the couch.',
    'The couch is waiting. You earned it.',
  ],
};

const FRASES: Record<Language, Record<GymratEvent, Frase[]>> = { es: FRASES_ES, en: FRASES_EN };

const VOCATIVO: Record<Language, Record<Trato, string>> = {
  es: { rey: ', mi rey', reina: ', mi reina', neutral: '' },
  en: { rey: ', king', reina: ', queen', neutral: '' },
};

/** La última frase usada de cada evento, para no repetirla seguida. */
const ultima = new Map<GymratEvent, number>();

function texto(frase: Frase, trato: Trato, lang: Language): string {
  return typeof frase === 'string' ? frase.replace('{voc}', VOCATIVO[lang][trato]) : frase[trato];
}

/**
 * Una frase del evento, al azar y nunca la misma dos veces seguidas (RF-F55). En Modo serio
 * devuelve `null`: quien llama decide si muestra algo sobrio o nada.
 */
export function gymratLine(event: GymratEvent, trato: Trato, serious: boolean, lang: Language = getLanguage()): string | null {
  if (serious) return null;
  const frases = FRASES[lang][event];
  const previa = ultima.get(event);
  let i = Math.floor(Math.random() * frases.length);
  if (frases.length > 1 && i === previa) i = (i + 1) % frases.length;
  ultima.set(event, i);
  return texto(frases[i], trato, lang);
}

/**
 * Una frase fija para algo que se vuelve a pintar (el resumen, el aviso de pierna): la
 * elige una semilla, así no cambia en cada render.
 */
export function gymratLineFor(event: GymratEvent, trato: Trato, serious: boolean, seed: string, lang: Language = getLanguage()): string | null {
  if (serious) return null;
  const frases = FRASES[lang][event];
  return texto(frases[hash(seed) % frases.length], trato, lang);
}

export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ── Equivalencias de tonelaje (RF-F59) ─────────────────────────────────────────────────

type Cosa = { singular: string; plural: string };

const COSAS: { kg: number; es: Cosa; en: Cosa }[] = [
  { kg: 150_000, es: { singular: 'ballena azul', plural: 'ballenas azules' }, en: { singular: 'blue whale', plural: 'blue whales' } },
  { kg: 12_000, es: { singular: 'autobús', plural: 'autobuses' }, en: { singular: 'bus', plural: 'buses' } },
  { kg: 8_000, es: { singular: 'T-rex', plural: 'T-rex' }, en: { singular: 'T. rex', plural: 'T. rexes' } },
  { kg: 6_000, es: { singular: 'elefante africano', plural: 'elefantes africanos' }, en: { singular: 'African elephant', plural: 'African elephants' } },
  { kg: 1_500, es: { singular: 'hipopótamo', plural: 'hipopótamos' }, en: { singular: 'hippo', plural: 'hippos' } },
  { kg: 1_200, es: { singular: 'auto compacto', plural: 'autos compactos' }, en: { singular: 'compact car', plural: 'compact cars' } },
  { kg: 600, es: { singular: 'vaca', plural: 'vacas' }, en: { singular: 'cow', plural: 'cows' } },
  { kg: 480, es: { singular: 'piano de cola', plural: 'pianos de cola' }, en: { singular: 'grand piano', plural: 'grand pianos' } },
  { kg: 70, es: { singular: 'lavadora', plural: 'lavadoras' }, en: { singular: 'washing machine', plural: 'washing machines' } },
];

/**
 * "14,320 kg = 2.4 elefantes africanos". Se elige entre las cosas que caben de 2 a 30
 * veces, con una semilla para que el mismo resumen diga siempre lo mismo.
 */
export function tonnageEquivalence(volumeKg: number, seed: string, lang: Language = getLanguage()): string | null {
  if (volumeKg < 140) return null;
  const candidatas = COSAS.filter((c) => volumeKg / c.kg >= 2 && volumeKg / c.kg <= 30);
  const cosa = candidatas.length > 0 ? candidatas[hash(seed) % candidatas.length] : COSAS.find((c) => volumeKg / c.kg >= 1);
  if (!cosa) return null;
  const n = volumeKg / cosa.kg;
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  const cifra = n < 10 ? n.toLocaleString(locale, { maximumFractionDigits: 1 }) : Math.round(n).toLocaleString(locale);
  const nombre = cosa[lang];
  return `${cifra} ${cifra === '1' ? nombre.singular : nombre.plural}`;
}

// ── Racha de Hierro (RF-F58) ────────────────────────────────────────────────────────────

export const STREAK_REASONS = ['busy', 'sick', 'travel', 'planned_rest', 'other'] as const;
export type StreakReason = (typeof STREAK_REASONS)[number];

export function streakReasonLabel(reason: string, trato: Trato, lang: Language = getLanguage()): string {
  if (lang === 'en') {
    const EN: Record<string, string> = { busy: 'Busy', sick: 'Sick', travel: 'Travel', planned_rest: 'Planned rest' };
    return EN[reason] ?? 'Other';
  }
  switch (reason) {
    case 'busy':
      return trato === 'rey' ? 'Ocupado' : trato === 'reina' ? 'Ocupada' : 'Sin tiempo';
    case 'sick':
      return 'Enfermedad';
    case 'travel':
      return 'Viaje';
    case 'planned_rest':
      return 'Descanso planeado';
    default:
      return 'Otro';
  }
}

export const TRATOS: { value: Trato; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'rey', label: 'Rey' },
  { value: 'reina', label: 'Reina' },
];
