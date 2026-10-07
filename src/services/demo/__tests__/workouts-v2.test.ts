/**
 * Gym v2 en el demo (spec 07 v2): historial por ejercicio, búsqueda de notas, registro para la
 * racha, agrupaciones y duración. Mismo contrato que Supabase.
 */
import type { WorkoutsApi } from '@/services/contracts';
import type { WorkoutSet } from '@/types/domain';

jest.mock('@/services/demo/store', () => ({
  ...jest.requireActual('@/services/demo/store'),
  delay: () => Promise.resolve(),
}));

const YO = 'demo-user';
const OTRA = 'demo-ana';

function fresh(): WorkoutsApi {
  jest.resetModules();
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  return (require('@/services/demo/workouts') as typeof import('@/services/demo/workouts')).demoWorkouts;
}

const cuando = (dia: number, h = 18) => new Date(2026, 8, dia, h, 0).toISOString();
const ej = (name: string, over = {}) => ({ name, sets: null, reps: null, weight: null, duration_minutes: null, notes: null, ...over });
const serie = (id: string, exId: string, over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id, workout_exercise_id: exId, sort_order: 1, set_type: 'working', intensifiers: [], target: null, rpe: null, rir: null,
  failure: null, tempo: null, rom: null, side: null, load_mods: null, gear: [], spotter: false, rest_after_sec: null,
  completed_at: cuando(1), notes: null, tags: [], from_legacy: false,
  segments: [{ id: `${id}-g`, set_id: id, sort_order: 0, kind: 'main', weight_kg: 60, input_unit: 'kg', reps: 10, reps_left: null, reps_right: null, partial_reps: null, forced_reps: null, cheat_reps: null, duration_sec: null, distance_m: null, rest_before_sec: null, variant_exercise_id: null, notes: null }],
  ...over,
});

describe('historial de un ejercicio (RF-F26)', () => {
  it('por exercise_id cuando está ligado al catálogo, de la sesión más nueva a la más vieja', async () => {
    const api = fresh();
    const a = await api.create(YO, { performed_at: cuando(1), status: 'completed' });
    const b = await api.create(YO, { performed_at: cuando(8), status: 'completed' });
    await api.addExercise(a.id, ej('Banca', { exercise_id: 'cat-banca' }));
    await api.addExercise(b.id, ej('Press de banca', { exercise_id: 'cat-banca' }));
    const h = await api.exerciseHistory(YO, { exerciseId: 'cat-banca', name: 'x' });
    expect(h.map((x) => x.workout_id)).toEqual([b.id, a.id]);
  });

  it('sin ligar, por nombre exacto (sin importar mayúsculas)', async () => {
    const api = fresh();
    const w = await api.create(YO, { performed_at: cuando(1) });
    await api.addExercise(w.id, ej('Remo en máquina'));
    await api.addExercise(w.id, ej('Remo'));
    const h = await api.exerciseHistory(YO, { exerciseId: null, name: 'remo en MÁQUINA' });
    expect(h).toHaveLength(1);
  });

  it('no cuenta sesiones descartadas, borradas ni de otra persona', async () => {
    const api = fresh();
    const descartada = await api.create(YO, { performed_at: cuando(1), status: 'discarded' });
    const borrada = await api.create(YO, { performed_at: cuando(2) });
    const ajena = await api.create(OTRA, { performed_at: cuando(3) });
    for (const w of [descartada, borrada, ajena]) await api.addExercise(w.id, ej('Curl', { exercise_id: 'cat-curl' }));
    await api.remove(borrada.id);
    expect(await api.exerciseHistory(YO, { exerciseId: 'cat-curl', name: 'Curl' })).toEqual([]);
  });
});

describe('buscar en las notas (RF-F53)', () => {
  it('encuentra en los tres niveles: sesión, ejercicio y serie', async () => {
    const api = fresh();
    const w = await api.create(YO, { performed_at: cuando(1), notes: 'Me dolió el hombro' });
    const ex = await api.addExercise(w.id, ej('Banca', { notes: 'Hombro raro' }));
    await api.saveSets([serie('s1', ex.id, { notes: 'hombro al final' })]);
    const hits = await api.searchNotes(YO, 'hombro');
    expect(hits.map((h) => h.where).sort()).toEqual(['exercise', 'session', 'set']);
    expect(hits.find((h) => h.where === 'set')?.exercise_name).toBe('Banca');
  });

  it('con menos de dos letras no busca', async () => {
    const api = fresh();
    await api.create(YO, { performed_at: cuando(1), notes: 'h' });
    expect(await api.searchNotes(YO, 'h')).toEqual([]);
  });

  it('deja fuera lo borrado y lo descartado', async () => {
    const api = fresh();
    const w = await api.create(YO, { performed_at: cuando(1), notes: 'zapatillas', status: 'discarded' });
    const v = await api.create(YO, { performed_at: cuando(2) });
    const ex = await api.addExercise(v.id, ej('Sentadilla', { notes: 'zapatillas nuevas' }));
    await api.removeExercise(ex.id);
    expect(w.id).toBeTruthy();
    // La sesión demo ya trae notas propias; se busca una palabra que solo existe aquí.
    expect(await api.searchNotes(YO, 'zapatillas')).toEqual([]);
  });
});

describe('racha: registro y decisiones (RF-F58)', () => {
  it('el registro solo trae sesiones terminadas, de la más vieja a la más nueva', async () => {
    const api = fresh();
    const vieja = await api.create(YO, { performed_at: cuando(1), status: 'completed' });
    await api.create(YO, { performed_at: cuando(2), status: 'active' });
    const nueva = await api.create(YO, { performed_at: cuando(5), status: 'completed' });
    const ids = (await api.trainingLog(YO)).map((w) => w.id);
    expect(ids).toEqual(expect.arrayContaining([vieja.id, nueva.id]));
    expect(ids.indexOf(vieja.id)).toBeLessThan(ids.indexOf(nueva.id));
    expect((await api.trainingLog(YO)).every((w) => w.status === 'completed')).toBe(true);
  });

  it('guardar una decisión de la misma semana la reemplaza en vez de duplicarla', async () => {
    const api = fresh();
    await api.saveStreakEvents(YO, [{ week_start: '2026-10-05', decision: 'kept', note: null, reasons: ['travel'] }]);
    await api.saveStreakEvents(YO, [{ week_start: '2026-10-05', decision: 'reset', note: 'mejor reinicio', reasons: [] }]);
    const eventos = await api.listStreakEvents(YO);
    expect(eventos.filter((e) => e.week_start === '2026-10-05')).toEqual([
      expect.objectContaining({ decision: 'reset', note: 'mejor reinicio', reasons: [] }),
    ]);
    expect(await api.listStreakEvents(OTRA)).toEqual([]);
  });
});

describe('agrupaciones (RF-F45)', () => {
  it('el grupo queda seguido, en el lugar del primero, con A1, A2…', async () => {
    const api = fresh();
    const w = await api.create(YO, { performed_at: cuando(1) });
    const a = await api.addExercise(w.id, ej('A'));
    const b = await api.addExercise(w.id, ej('B'));
    const c = await api.addExercise(w.id, ej('C'));
    await api.createGroup(w.id, { type: 'superset', exerciseIds: [a.id, c.id], rounds: null, rest_after_round_sec: 90 });
    const detalle = await api.getById(w.id);
    expect(detalle.exercises.map((e) => [e.name, e.group_position])).toEqual([
      ['A', 1],
      ['C', 2],
      ['B', null],
    ]);
    expect(detalle.groups[0]).toMatchObject({ type: 'superset', rest_after_round_sec: 90 });
    expect(b.id).toBeTruthy();
  });

  it('desagrupar suelta a los ejercicios y el grupo desaparece', async () => {
    const api = fresh();
    const w = await api.create(YO, { performed_at: cuando(1) });
    const a = await api.addExercise(w.id, ej('A'));
    const b = await api.addExercise(w.id, ej('B'));
    const g = await api.createGroup(w.id, { type: 'superset', exerciseIds: [a.id, b.id], rounds: null, rest_after_round_sec: null });
    await api.removeGroup(g.id);
    const detalle = await api.getById(w.id);
    expect(detalle.exercises.every((e) => e.group_id === null && e.group_position === null)).toBe(true);
    expect(detalle.groups).toEqual([]);
  });
});

describe('duración (RF-F3, T244)', () => {
  it('con hora de fin: fin menos inicio', async () => {
    const api = fresh();
    const w = await api.create(YO, { performed_at: cuando(1, 18) });
    await api.update(w.id, { ended_at: new Date(2026, 8, 1, 19, 15).toISOString() });
    expect((await api.getById(w.id)).duration_minutes).toBe(75);
  });

  it('sin hora de fin: la suma de los ejercicios de v1', async () => {
    const api = fresh();
    const w = await api.create(YO, { performed_at: cuando(1) });
    await api.addExercise(w.id, ej('Bici', { duration_minutes: 20 }));
    await api.addExercise(w.id, ej('Plancha', { duration_minutes: 5 }));
    expect((await api.getById(w.id)).duration_minutes).toBe(25);
  });
});
