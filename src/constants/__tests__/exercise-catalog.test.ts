/**
 * Catálogo de ejercicios (RF-F20, RF-F21). Fija tres cosas: que está completo frente al
 * Apéndice A del prompt (no se quitó ninguno), que cada slug es único —es la llave del
 * upsert en la base— y que la inferencia de equipo y registro acierta en los casos que
 * engañan ("Pushdown con barra recta" es de polea, "con peso corporal" no es lastre).
 */

import { buildCatalog, EQUIPMENT, MUSCLES, PATTERNS, TRACKING_TYPES } from '@/constants/exercise-catalog';

// `fs` solo existe al correr en Jest (Node). El proyecto no trae los tipos de Node a propósito
// —la app no corre en Node—, así que aquí se declara lo poco que se usa.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { readFileSync } = require('fs') as { readFileSync: (ruta: string, codificacion: 'utf8') => string };
declare const __dirname: string;

const catalogo = buildCatalog();
const porNombre = new Map(catalogo.map((e) => [e.name_es, e]));
const de = (nombre: string) => {
  const e = porNombre.get(nombre);
  if (!e) throw new Error(`No está en el catálogo: ${nombre}`);
  return e;
};

describe('completitud', () => {
  it('tiene al menos 530 ejercicios', () => {
    expect(catalogo.length).toBeGreaterThanOrEqual(530);
  });

  it('incluye cada ejercicio del Apéndice A, con su nombre exacto', () => {
    const md = readFileSync(`${__dirname}/../../../prompt-gym-tracker-upgrade.md`, 'utf8');
    const apendice = md.slice(md.indexOf('## Apéndice A'));
    const nombres = apendice.split('\n').filter((l: string) => l.startsWith('- ')).map((l: string) => l.slice(2).trim());
    expect(nombres.length).toBeGreaterThanOrEqual(530);
    expect(nombres.filter((n) => !porNombre.has(n))).toEqual([]);
  });

  it('cada slug es único: es la llave del upsert', () => {
    const slugs = catalogo.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))).toBe(true);
  });

  it('todos tienen nombre en inglés y al menos un músculo', () => {
    expect(catalogo.filter((e) => !e.name_en.trim())).toEqual([]);
    expect(catalogo.filter((e) => e.primary_muscles.length === 0)).toEqual([]);
  });

  it('solo usa claves de la taxonomía', () => {
    for (const e of catalogo) {
      for (const m of [...e.primary_muscles, ...e.secondary_muscles]) expect(MUSCLES).toHaveProperty(m);
      for (const q of e.equipment) expect(EQUIPMENT).toHaveProperty(q);
      expect(PATTERNS).toHaveProperty(e.movement_pattern);
      expect(TRACKING_TYPES).toHaveProperty(e.tracking_type);
    }
  });
});

describe('inferencia desde el nombre', () => {
  it('equipo explícito en el nombre', () => {
    expect(de('Press de banca plano con mancuernas').equipment).toEqual(['dumbbell']);
    expect(de('Press de banca plano en Smith').equipment).toEqual(['smith']);
    expect(de('Elevaciones laterales en polea').equipment).toEqual(['cable']);
    expect(de('Pushdown con cuerda').equipment).toEqual(['cable']);
  });

  it('"barra EZ" no cuenta también como barra', () => {
    expect(de('Curl con barra EZ').equipment).toEqual(['ez_bar']);
  });

  it('las excepciones mandan: un pushdown con barra es de polea', () => {
    expect(de('Pushdown con barra recta').equipment).toEqual(['cable']);
    expect(de('Colgado en barra (dead hang)').equipment).toEqual(['bodyweight']);
  });

  it('sin equipo en el nombre se usa el de la familia', () => {
    expect(de('Press de banca con pausa').equipment).toEqual(['barbell']);
    expect(de('Dominadas pronas').equipment).toEqual(['bodyweight']);
  });

  it('lastrado, asistido y peso corporal', () => {
    expect(de('Dominadas pronas').tracking_type).toBe('bodyweight_reps');
    expect(de('Dominadas lastradas').tracking_type).toBe('weighted_bodyweight');
    expect(de('Dominadas asistidas en máquina').tracking_type).toBe('assisted_bodyweight');
    expect(de('Fondos lastrados').tracking_type).toBe('weighted_bodyweight');
    expect(de('Lagartijas con lastre o chaleco').tracking_type).toBe('weighted_bodyweight');
    // "con peso corporal" no es "con peso".
    expect(de('Sentadilla con peso corporal').tracking_type).toBe('bodyweight_reps');
  });

  it('lateralidad', () => {
    expect(de('Remo con mancuerna a una mano').laterality).toBe('unilateral');
    expect(de('Curl con mancuernas alterno').laterality).toBe('alternating');
    expect(de('Sentadilla búlgara con mancuernas').laterality).toBe('unilateral');
    expect(de('Press de banca plano con barra').laterality).toBe('bilateral');
  });

  it('tiempo y distancia', () => {
    expect(de('Plancha frontal').tracking_type).toBe('duration');
    expect(de('Caminadora corriendo').tracking_type).toBe('distance_duration');
    expect(de('Caminata de granjero (farmer\'s walk)').tracking_type).toBe('weight_distance');
  });

  it('slug sin acentos ni signos', () => {
    expect(de('Elíptica').slug).toBe('eliptica');
    expect(de('Press inclinado bajo (15–30°) con mancuernas').slug).toBe('press-inclinado-bajo-15-30-con-mancuernas');
  });
});
