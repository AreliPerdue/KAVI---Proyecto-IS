import type { Trato } from '@/store/gym-store';

/**
 * Modo Gymrat (spec 07 v2, §8). Todo el humor vive aquí: si "Modo serio" está prendido,
 * nada de esto se muestra (RF-F54).
 *
 * Una frase es texto con `{voc}` (", mi rey", ", mi reina" o nada) o, cuando la gramática
 * cambia con el trato, una variante por trato (RF-F55).
 */
type Frase = string | Record<Trato, string>;

export type GymratEvent = 'pr' | 'drop' | 'myo' | 'rest_end' | 'leg_day' | 'no_legs' | 'session_done';

const FRASES: Record<GymratEvent, Frase[]> = {
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

const VOCATIVO: Record<Trato, string> = { rey: ', mi rey', reina: ', mi reina', neutral: '' };

/** La última frase usada de cada evento, para no repetirla seguida. */
const ultima = new Map<GymratEvent, number>();

function texto(frase: Frase, trato: Trato): string {
  return typeof frase === 'string' ? frase.replace('{voc}', VOCATIVO[trato]) : frase[trato];
}

/**
 * Una frase del evento, al azar y nunca la misma dos veces seguidas (RF-F55). En Modo serio
 * devuelve `null`: quien llama decide si muestra algo sobrio o nada.
 */
export function gymratLine(event: GymratEvent, trato: Trato, serious: boolean): string | null {
  if (serious) return null;
  const frases = FRASES[event];
  const previa = ultima.get(event);
  let i = Math.floor(Math.random() * frases.length);
  if (frases.length > 1 && i === previa) i = (i + 1) % frases.length;
  ultima.set(event, i);
  return texto(frases[i], trato);
}

/**
 * Una frase fija para algo que se vuelve a pintar (el resumen, el aviso de pierna): la
 * elige una semilla, así no cambia en cada render.
 */
export function gymratLineFor(event: GymratEvent, trato: Trato, serious: boolean, seed: string): string | null {
  if (serious) return null;
  const frases = FRASES[event];
  return texto(frases[hash(seed) % frases.length], trato);
}

export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ── Equivalencias de tonelaje (RF-F59) ─────────────────────────────────────────────────

const COSAS: { singular: string; plural: string; kg: number }[] = [
  { singular: 'ballena azul', plural: 'ballenas azules', kg: 150_000 },
  { singular: 'autobús', plural: 'autobuses', kg: 12_000 },
  { singular: 'T-rex', plural: 'T-rex', kg: 8_000 },
  { singular: 'elefante africano', plural: 'elefantes africanos', kg: 6_000 },
  { singular: 'hipopótamo', plural: 'hipopótamos', kg: 1_500 },
  { singular: 'auto compacto', plural: 'autos compactos', kg: 1_200 },
  { singular: 'vaca', plural: 'vacas', kg: 600 },
  { singular: 'piano de cola', plural: 'pianos de cola', kg: 480 },
  { singular: 'lavadora', plural: 'lavadoras', kg: 70 },
];

/**
 * "14,320 kg = 2.4 elefantes africanos". Se elige entre las cosas que caben de 2 a 30
 * veces, con una semilla para que el mismo resumen diga siempre lo mismo.
 */
export function tonnageEquivalence(volumeKg: number, seed: string): string | null {
  if (volumeKg < 140) return null;
  const candidatas = COSAS.filter((c) => volumeKg / c.kg >= 2 && volumeKg / c.kg <= 30);
  const cosa = candidatas.length > 0 ? candidatas[hash(seed) % candidatas.length] : COSAS.find((c) => volumeKg / c.kg >= 1);
  if (!cosa) return null;
  const n = volumeKg / cosa.kg;
  const cifra = n < 10 ? n.toLocaleString('es-MX', { maximumFractionDigits: 1 }) : Math.round(n).toLocaleString('es-MX');
  return `${cifra} ${cifra === '1' ? cosa.singular : cosa.plural}`;
}

// ── Racha de Hierro (RF-F58) ────────────────────────────────────────────────────────────

export const STREAK_REASONS = ['busy', 'sick', 'travel', 'planned_rest', 'other'] as const;
export type StreakReason = (typeof STREAK_REASONS)[number];

export function streakReasonLabel(reason: string, trato: Trato): string {
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
