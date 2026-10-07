/**
 * Progreso (spec 07 v2, §8): racha, logros, series por músculo y la semana del bento. Todo se
 * calcula del historial; estas pruebas fijan las reglas que no se ven en la pantalla.
 */
import { computeAchievements, unlockedBy } from '@/lib/gym/achievements';
import { isLegDay, musclesWorked, setsByGroup } from '@/lib/gym/muscles';
import { computeStreak, STREAK_SINCE } from '@/lib/gym/streak';
import { weekSummary } from '@/lib/gym/week';

import { CATALOGO, ejercicio, serie, sesion } from './fixtures';

/** Miércoles 7 de octubre de 2026 al mediodía: la semana va del lunes 5 al domingo 11. */
const HOY = new Date(2026, 9, 7, 12, 0);
const dia = (y: number, m: number, d: number, h = 18) => new Date(y, m - 1, d, h, 0);

describe('Racha de Hierro (RF-F58)', () => {
  const semanas = (...lunes: [number, number, number][]) => lunes.map(([y, m, d]) => dia(y, m, d));

  it('sin entrenos no hay racha', () => {
    expect(computeStreak([], [], HOY)).toEqual({ weeks: 0, best: 0, paused: null, trainedThisWeek: false });
  });

  it('cuenta semanas seguidas, no días', () => {
    const r = computeStreak([...semanas([2026, 9, 28], [2026, 9, 29], [2026, 10, 5])], [], HOY);
    expect(r.weeks).toBe(2);
    expect(r.trainedThisWeek).toBe(true);
  });

  it('la semana en curso sin entreno no rompe ni pregunta', () => {
    const r = computeStreak(semanas([2026, 9, 28]), [], HOY);
    expect(r).toMatchObject({ weeks: 1, paused: null, trainedThisWeek: false });
  });

  it('una semana vacía ya terminada pone la racha en pausa, no en cero', () => {
    const r = computeStreak(semanas([2026, 9, 28]), [], dia(2026, 10, 14));
    expect(r.weeks).toBe(1);
    expect(r.paused).toEqual({ weeks: ['2026-10-05'] });
  });

  it('varias semanas vacías seguidas son un solo hueco y una sola pregunta', () => {
    const r = computeStreak(semanas([2026, 9, 28]), [], dia(2026, 10, 28));
    expect(r.paused?.weeks).toEqual(['2026-10-05', '2026-10-12', '2026-10-19']);
  });

  it('"Mi racha sigue": la semana justificada no suma pero tampoco rompe', () => {
    const r = computeStreak(semanas([2026, 9, 28], [2026, 10, 12]), [{ week_start: '2026-10-05', decision: 'kept' }], dia(2026, 10, 14));
    expect(r).toMatchObject({ weeks: 2, paused: null });
  });

  it('"Reiniciar" vuelve a empezar desde la semana siguiente', () => {
    const r = computeStreak(semanas([2026, 9, 28], [2026, 10, 12]), [{ week_start: '2026-10-05', decision: 'reset' }], dia(2026, 10, 14));
    expect(r.weeks).toBe(1);
    expect(r.best).toBe(1);
  });

  it('los huecos de antes de que existiera la racha no se preguntan', () => {
    const r = computeStreak(semanas([2026, 9, 7], [2026, 9, 28]), [], dia(2026, 9, 30));
    expect(STREAK_SINCE).toBe('2026-09-28');
    expect(r).toMatchObject({ weeks: 1, paused: null });
  });

  it('guarda la mejor racha aunque la actual sea menor', () => {
    const r = computeStreak(
      semanas([2026, 9, 28], [2026, 10, 5], [2026, 10, 19]),
      [{ week_start: '2026-10-12', decision: 'reset' }],
      dia(2026, 10, 21),
    );
    expect(r).toMatchObject({ weeks: 1, best: 2 });
  });
});

describe('series por músculo (RF-F60)', () => {
  it('primario cuenta 1 y secundario ½, sin doble conteo', () => {
    const banca = ejercicio('banca', [serie(60, 10), serie(60, 10), serie(60, 10)]);
    const grupos = setsByGroup([banca], CATALOGO);
    expect(grupos.get('chest')).toBe(3);
    expect(grupos.get('triceps')).toBe(1.5);
    expect(grupos.get('shoulders')).toBe(1.5);
  });

  it('el calentamiento y las series sin marcar no cuentan', () => {
    const sets = [serie(40, 10, { set_type: 'warmup' }), serie(60, 10, { completed_at: null }), serie(60, 10)];
    expect(setsByGroup([ejercicio('banca', sets)], CATALOGO).get('chest')).toBe(1);
  });

  it('un ejercicio libre (sin catálogo) no suma a ningún grupo', () => {
    expect(setsByGroup([ejercicio(null, [serie(60, 10)])], CATALOGO).size).toBe(0);
  });

  it('leg day: seis series efectivas de pierna o más', () => {
    const cinco = ejercicio('sentadilla', Array.from({ length: 5 }, () => serie(80, 8)));
    const seis = ejercicio('sentadilla', Array.from({ length: 6 }, () => serie(80, 8)));
    expect(isLegDay([cinco], CATALOGO)).toBe(false);
    expect(isLegDay([seis], CATALOGO)).toBe(true);
  });

  it('músculos trabajados: claves de grupo con al menos una serie entera, en el orden del cuerpo', () => {
    // Una serie de banca le da ½ a hombro y tríceps: no llega a contarlos como trabajados.
    const lista = musclesWorked([ejercicio('curl', [serie(12, 10)]), ejercicio('banca', [serie(60, 10)])], CATALOGO);
    expect(lista).toEqual(['chest', 'biceps']);
  });
});

describe('esta semana en el bento (RF-F66)', () => {
  const lunes = dia(2026, 10, 5);
  const domingoAnterior = dia(2026, 10, 4, 23);

  it('solo cuenta de lunes a domingo de la semana actual', () => {
    const r = weekSummary(
      [sesion(lunes, [ejercicio('banca', [serie(60, 10)])]), sesion(domingoAnterior, [ejercicio('banca', [serie(60, 10)])])],
      CATALOGO,
      HOY,
    );
    expect(r.sessions).toBe(1);
    expect(r.volumeKg).toBe(600);
  });

  it('el calentamiento no es volumen', () => {
    const r = weekSummary([sesion(lunes, [ejercicio('banca', [serie(40, 10, { set_type: 'warmup' }), serie(60, 10)])])], CATALOGO, HOY);
    expect(r.volumeKg).toBe(600);
  });

  it('los tres grupos con más series, de más a menos, con medias series del secundario', () => {
    const r = weekSummary(
      [
        sesion(lunes, [
          ejercicio('sentadilla', [serie(80, 8), serie(80, 8), serie(80, 8), serie(80, 8)]),
          ejercicio('banca', [serie(60, 10), serie(60, 10), serie(60, 10)]),
          ejercicio('curl', [serie(12, 10)]),
        ]),
      ],
      CATALOGO,
      HOY,
    );
    expect(r.topGroups).toEqual([
      { key: 'quads', sets: 4 },
      { key: 'chest', sets: 3 },
      { key: 'glutes', sets: 2 },
    ]);
  });

  it('sin entrenos esta semana: cero y sin grupos', () => {
    expect(weekSummary([], CATALOGO, HOY)).toEqual({ sessions: 0, volumeKg: 0, topGroups: [] });
  });
});

describe('logros (RF-F57)', () => {
  const sentadillas = (n: number, kg = 80) => ejercicio('sentadilla', Array.from({ length: n }, () => serie(kg, 8)));

  it('son nueve y empiezan bloqueados', () => {
    const logros = computeAchievements([], CATALOGO, 0, 'neutral', 'es');
    expect(logros).toHaveLength(9);
    expect(logros.every((a) => !a.unlocked && a.progress === 0)).toBe(true);
  });

  it('Leg Day Survivor cuenta sesiones de pierna', () => {
    const log = Array.from({ length: 10 }, (_, i) => sesion(dia(2026, 9, 1 + i), [sentadillas(6)]));
    const logro = computeAchievements(log, CATALOGO, 0, 'neutral', 'es').find((a) => a.id === 'leg_day_survivor');
    expect(logro).toMatchObject({ progress: 10, goal: 10, unlocked: true });
  });

  it('el club de 140 kg pide barra y al menos una rep; el avance no pasa de la meta', () => {
    const log = [sesion(dia(2026, 9, 1), [sentadillas(1, 150)])];
    const club = computeAchievements(log, CATALOGO, 0, 'neutral', 'es').find((a) => a.id === 'club_squat');
    expect(club).toMatchObject({ progress: 140, unlocked: true });
  });

  it('el calentamiento y lo no marcado no cuentan para logros', () => {
    const sets = [serie(200, 1, { set_type: 'warmup' }), serie(200, 1, { completed_at: null })];
    const club = computeAchievements([sesion(dia(2026, 9, 1), [ejercicio('sentadilla', sets)])], CATALOGO, 0, 'neutral', 'es').find(
      (a) => a.id === 'club_squat',
    );
    expect(club?.progress).toBe(0);
  });

  it('la realeza del drop set sigue el trato elegido', () => {
    const titulo = (trato: 'rey' | 'reina' | 'neutral', lang: 'es' | 'en') =>
      computeAchievements([], CATALOGO, 0, trato, lang).find((a) => a.id === 'drop_royalty')?.title;
    expect(titulo('rey', 'es')).toBe('Rey del Drop Set');
    expect(titulo('reina', 'es')).toBe('Reina del Drop Set');
    expect(titulo('neutral', 'es')).toBe('Realeza del Drop Set');
    expect(titulo('rey', 'en')).toBe('Drop Set King');
    expect(titulo('reina', 'en')).toBe('Drop Set Queen');
  });

  it('en inglés traduce títulos, descripciones y unidades (spec 12)', () => {
    const logros = computeAchievements([], CATALOGO, 1, 'neutral', 'en');
    const racha = logros.find((a) => a.id === 'iron_streak');
    expect(racha).toMatchObject({ title: 'Iron Streak', unit: 'weeks' });
    expect(logros.find((a) => a.id === 'club_bench')?.description).toBe('100 kg on the barbell bench press, at least one rep.');
  });

  it('el resumen atribuye a la sesión solo lo que ella desbloqueó, nunca la racha', () => {
    const anteriores = Array.from({ length: 9 }, (_, i) => sesion(dia(2026, 9, 1 + i), [sentadillas(6)]));
    const decima = sesion(dia(2026, 9, 20), [sentadillas(6)]);
    const nuevos = unlockedBy(decima.id, [...anteriores, decima], CATALOGO, 12, 'neutral', 'es');
    expect(nuevos.map((a) => a.id)).toEqual(['leg_day_survivor']);
  });
});
