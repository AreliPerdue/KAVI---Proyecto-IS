/**
 * Idioma de la interfaz (spec 12). Lo que no se ve en pantalla hasta que falla: que el inglés
 * tenga todos los textos del español con la misma forma, que el idioma del sistema se detecte
 * bien y que lo que KAVI trae (temas, ejercicios, glosario) se traduzca y lo de la persona no.
 */
import { GLOSSARY } from '@/constants/glossary';
import { en } from '@/i18n/en';
import { es } from '@/i18n/es';
import { formatNumber, getLanguage, intlLocale, resolveLanguage, setLanguage, subscribeLanguage, systemLanguage, t } from '@/i18n';
import { formatDate, formatDayTitle, formatMonthTitle, formatShortDate, formatThreeDaysTitle, formatTime, formatWeekTitle } from '@/lib/dates';
import { glossaryEntries, localizedGlossaryEntry } from '@/lib/glossary';
import {
  equipmentName,
  exerciseName,
  intensifierLabel,
  muscleGroupName,
  muscleName,
  setTypeDescription,
  setTypeLabel,
  tagLabel,
  workoutExerciseName,
} from '@/lib/gym/display-names';
import { normalizar } from '@/lib/gym/search';
import { dimensionName, themeName } from '@/lib/theme-name';
import { traducirDeLaBase } from '@/services/supabase/errors';
import { timeFormatFor } from '@/store/preferences-store';

afterEach(() => setLanguage('es'));

/** Las rutas de todas las hojas de un diccionario con su tipo: "fitness.workout.undo:string". */
function forma(obj: unknown, ruta = ''): string[] {
  if (typeof obj === 'function') return [`${ruta}:function`];
  if (typeof obj === 'string') return [`${ruta}:string`];
  if (obj === null) return [`${ruta}:null`];
  if (Array.isArray(obj)) return [`${ruta}:array`];
  if (typeof obj === 'object') {
    return Object.keys(obj as object)
      .sort()
      .flatMap((k) => forma((obj as Record<string, unknown>)[k], ruta ? `${ruta}.${k}` : k));
  }
  return [`${ruta}:${typeof obj}`];
}

describe('diccionarios (RF-I8)', () => {
  /*
   * Los mapas que vienen del catálogo o de los datos (músculos, entradas del glosario, temas)
   * tienen las mismas claves pero no siempre la misma forma interna; se comparan aparte.
   */
  const libres = ['catalog.', 'glossary.entries.', 'privacy.sections', 'privacy.referenceNote', 'training.'];
  const fijas = (rutas: string[]) => rutas.filter((r) => !libres.some((l) => r.startsWith(l)));

  it('el inglés tiene exactamente los textos del español, con la misma forma', () => {
    const faltan = fijas(forma(es)).filter((r) => !forma(en).includes(r));
    const sobran = fijas(forma(en)).filter((r) => !forma(es).includes(r));
    expect({ faltan, sobran }).toEqual({ faltan: [], sobran: [] });
  });

  it('los mapas del catálogo y de entrenamiento tienen las mismas claves', () => {
    for (const mapa of ['muscles', 'equipment', 'patterns', 'tracking', 'muscleGroups'] as const) {
      expect(Object.keys(en.catalog[mapa]).sort()).toEqual(Object.keys(es.catalog[mapa]).sort());
    }
    for (const mapa of ['setTypes', 'intensifiers', 'groups', 'protocols', 'gear', 'tags', 'segments', 'prKinds'] as const) {
      expect(Object.keys(en.training[mapa]).sort()).toEqual(Object.keys(es.training[mapa]).sort());
    }
  });

  it('ningún texto en inglés quedó vacío', () => {
    const vacios: string[] = [];
    const revisar = (obj: unknown, ruta: string) => {
      if (typeof obj === 'string' && obj.trim() === '') vacios.push(ruta);
      else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) revisar(v, `${ruta}.${k}`);
    };
    revisar(en, 'en');
    expect(vacios).toEqual([]);
  });
});

describe('idioma del sistema (RF-I1)', () => {
  const original = (globalThis as { __KAVI_SYSTEM_LANGUAGE__?: string }).__KAVI_SYSTEM_LANGUAGE__;
  afterEach(() => {
    (globalThis as { __KAVI_SYSTEM_LANGUAGE__?: string }).__KAVI_SYSTEM_LANGUAGE__ = original;
  });

  it('"Sistema" sigue al teléfono; una elección fija manda', () => {
    (globalThis as { __KAVI_SYSTEM_LANGUAGE__?: string }).__KAVI_SYSTEM_LANGUAGE__ = 'en';
    expect(systemLanguage()).toBe('en');
    expect(resolveLanguage('system')).toBe('en');
    expect(resolveLanguage('es')).toBe('es');
  });

  it('cambiar de idioma avisa a quien escucha, y solo si cambia (RF-I2)', () => {
    const oyente = jest.fn();
    const quitar = subscribeLanguage(oyente);
    setLanguage('en');
    setLanguage('en');
    expect(oyente).toHaveBeenCalledTimes(1);
    expect(getLanguage()).toBe('en');
    quitar();
    setLanguage('es');
    expect(oyente).toHaveBeenCalledTimes(1);
  });
});

describe('fechas, horas y números (RF-I3)', () => {
  const lunes = new Date(2026, 9, 5, 19, 30);

  it('en inglés de EE. UU.', () => {
    expect(formatMonthTitle(lunes, 'en')).toBe('October 2026');
    expect(formatDayTitle(lunes, 'en')).toBe('Monday, October 5');
    expect(formatShortDate(lunes, 'en')).toBe('Mon, Oct 5');
    expect(formatDate(lunes, 'en')).toBe('Oct 5, 2026');
  });

  it('en español', () => {
    expect(formatMonthTitle(lunes, 'es')).toBe('Octubre 2026');
    expect(formatDayTitle(lunes, 'es')).toBe('Lunes 5 de octubre');
    expect(formatShortDate(lunes, 'es')).toBe('lun 5 oct');
    expect(formatDate(lunes, 'es')).toBe('5 oct 2026');
  });

  it('la semana y los tres días, también cuando cruzan de mes', () => {
    expect(formatWeekTitle(lunes, 'en')).toBe('Oct 5 – 11, 2026');
    expect(formatWeekTitle(new Date(2026, 8, 30), 'en')).toBe('Sep 28 – Oct 4, 2026');
    expect(formatWeekTitle(new Date(2026, 8, 30), 'es')).toBe('28 sep – 4 oct 2026');
    expect(formatThreeDaysTitle(new Date(2026, 8, 29), 'en')).toBe('Sep 29 – Oct 1, 2026');
  });

  it('sin elegir formato, 12 h en inglés y 24 h en español', () => {
    expect(timeFormatFor('en')).toBe('12h');
    expect(timeFormatFor('es')).toBe('24h');
    expect(typeof formatTime(lunes, 'en')).toBe('string');
  });

  it('números con el locale del idioma', () => {
    expect(intlLocale('en')).toBe('en-US');
    expect(intlLocale('es')).toBe('es-MX');
    expect(formatNumber(12620, 'en')).toBe('12,620');
  });
});

describe('lo que trae KAVI se traduce; lo de la persona, no (RF-I4, RF-I5)', () => {
  const GIMNASIO = { id: '00000000-0000-4000-8000-000000000001', name: 'Gimnasio' };

  it('un tema del sistema intacto se traduce por su id', () => {
    expect(themeName(GIMNASIO, 'en')).toBe('Gym');
    expect(themeName(GIMNASIO, 'es')).toBe('Gimnasio');
  });

  it('un tema del sistema renombrado se ve como lo escribió la persona', () => {
    expect(themeName({ ...GIMNASIO, name: 'Gym de la uni' }, 'en')).toBe('Gym de la uni');
  });

  it('un tema propio no se traduce nunca', () => {
    expect(themeName({ id: 'propio-1', name: 'Gimnasio' }, 'en')).toBe('Gimnasio');
  });

  it('las dimensiones se traducen', () => {
    expect(dimensionName('fisica', 'en')).toBe('Physical');
  });

  it('ejercicio del catálogo con name_en → inglés; sin name_en → como está', () => {
    expect(exerciseName({ name_es: 'Sentadilla', name_en: 'Back squat' }, 'en')).toBe('Back squat');
    expect(exerciseName({ name_es: 'Mi ejercicio', name_en: null }, 'en')).toBe('Mi ejercicio');
  });

  it('en una sesión, el nombre se traduce solo si sigue siendo el del catálogo', () => {
    const cat = { name_es: 'Press de banca plano con barra', name_en: 'Barbell bench press' };
    expect(workoutExerciseName('Press de banca plano con barra', cat, 'en')).toBe('Barbell bench press');
    expect(workoutExerciseName('Banca', cat, 'en')).toBe('Banca');
    expect(workoutExerciseName('Banca', null, 'en')).toBe('Banca');
  });

  it('músculos, equipo, grupos, tipos de serie, intensificadores y etiquetas', () => {
    expect(muscleName('quads', 'en')).toBe(en.catalog.muscles.quads);
    expect(equipmentName('barbell', 'en')).toBe(en.catalog.equipment.barbell);
    expect(muscleGroupName('glutes', 'en')).toBe('Glutes');
    expect(setTypeLabel('warmup', 'en')).toBe('Warm-up');
    expect(setTypeDescription('top_set', 'es')).toBe('La serie más pesada del ejercicio en el día.');
    expect(intensifierLabel('mechanical_drop', 'en')).toBe('Mechanical drop');
    expect(tagLabel('pain', 'en')).toBe('Pain');
  });

  it('una clave desconocida se ve tal cual, no como hueco', () => {
    expect(muscleName('musculo_nuevo', 'en')).toBe('musculo_nuevo');
    expect(intensifierLabel('nuevo', 'en')).toBe('nuevo');
    expect(setTypeDescription('nuevo', 'en')).toBe('');
  });
});

describe('mensajes que manda la base en español', () => {
  it('uno conocido sale en el idioma activo', () => {
    setLanguage('en');
    expect(traducirDeLaBase(es.errors.tooManyEmailsToday)).toBe(en.errors.tooManyEmailsToday);
  });

  it('uno desconocido se queda tal cual', () => {
    setLanguage('en');
    expect(traducirDeLaBase('Algo que la app no conoce')).toBe('Algo que la app no conoce');
  });
});

describe('glosario (RF-F64)', () => {
  it('ids únicos y cada entrada completa', () => {
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length);
    for (const e of GLOSSARY) {
      expect([e.term, e.meaning, e.example, e.short].every((x) => x.trim().length > 0)).toBe(true);
    }
  });

  it('cada término tiene su traducción, con el mismo tema y en el mismo orden', () => {
    const ingles = glossaryEntries('en');
    expect(ingles.map((e) => e.id)).toEqual(GLOSSARY.map((e) => e.id));
    expect(ingles.map((e) => e.topic)).toEqual(GLOSSARY.map((e) => e.topic));
    for (const e of ingles) expect(t('en').glossary.entries[e.id]).toBeDefined();
  });

  it('buscar "superserie" en español y "superset" en inglés encuentra el mismo término', () => {
    const buscar = (lang: 'es' | 'en', q: string) =>
      glossaryEntries(lang)
        .filter((e) => [e.term, e.also ?? '', e.meaning, e.short].some((x) => normalizar(x).includes(normalizar(q))))
        .map((e) => e.id);
    expect(buscar('es', 'superserie')).toContain('superset');
    expect(buscar('en', 'superset')).toContain('superset');
  });

  it('un término abierto desde el logger sale en el idioma pedido', () => {
    expect(localizedGlossaryEntry('rir', 'en')?.term).toBe('Reps in reserve');
    expect(localizedGlossaryEntry('rir', 'es')?.term).toBe('Reps en reserva');
  });
});
