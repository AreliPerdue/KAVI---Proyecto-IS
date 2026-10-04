/**
 * Cola local de la sesión activa (RF-F17 – RF-F19): lo que hace que una serie nunca
 * espere al servidor y que una sesión sobreviva a un cierre de la app.
 */
import type { WorkoutSet } from '@/types/domain';

const mockDisco = new Map<string, unknown>();
jest.mock('@/lib/storage', () => ({
  getJson: async (k: string) => (mockDisco.has(k) ? JSON.parse(JSON.stringify(mockDisco.get(k))) : null),
  setJson: async (k: string, v: unknown) => {
    mockDisco.set(k, JSON.parse(JSON.stringify(v)));
  },
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { acknowledge, applyOutbox, enqueue, loadOutbox } = require('@/lib/gym/outbox') as typeof import('@/lib/gym/outbox');

const serie = (id: string, over: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id, workout_exercise_id: 'ex1', sort_order: 1, set_type: 'working', intensifiers: [], target: null, rpe: null, rir: null,
  failure: null, tempo: null, rom: null, side: null, load_mods: null, gear: [], spotter: false, rest_after_sec: null,
  completed_at: null, notes: null, tags: [], from_legacy: false, segments: [], ...over,
});

beforeEach(() => mockDisco.clear());

it('guarda en el dispositivo y lo recupera (sobrevive a un cierre)', async () => {
  await enqueue({ op: 'save', workoutId: 'w1', set: serie('s1'), at: 1 });
  expect((await loadOutbox()).map((e) => e.op)).toEqual(['save']);
});

it('una entrada por serie: el último cambio gana', async () => {
  await enqueue({ op: 'save', workoutId: 'w1', set: serie('s1', { rir: 3 }), at: 1 });
  await enqueue({ op: 'save', workoutId: 'w1', set: serie('s1', { rir: 1 }), at: 2 });
  const cola = await loadOutbox();
  expect(cola).toHaveLength(1);
  expect(cola[0].op === 'save' && cola[0].set.rir).toBe(1);
});

it('borrar reemplaza un guardado pendiente de esa serie', async () => {
  await enqueue({ op: 'save', workoutId: 'w1', set: serie('s1'), at: 1 });
  await enqueue({ op: 'remove', workoutId: 'w1', setId: 's1', at: 2 });
  expect((await loadOutbox()).map((e) => e.op)).toEqual(['remove']);
});

it('confirmar quita lo enviado, pero no un cambio que llegó durante el envío', async () => {
  await enqueue({ op: 'save', workoutId: 'w1', set: serie('s1'), at: 1 });
  await enqueue({ op: 'save', workoutId: 'w1', set: serie('s2'), at: 1 });
  const enviado = await loadOutbox();
  await enqueue({ op: 'save', workoutId: 'w1', set: serie('s1', { rir: 0 }), at: 5 }); // toque nuevo mientras viajaba
  await acknowledge(enviado);
  const quedan = await loadOutbox();
  expect(quedan).toHaveLength(1);
  expect(quedan[0].op === 'save' && quedan[0].set.rir).toBe(0);
});

it('dos toques seguidos no se pisan al guardar', async () => {
  await Promise.all([
    enqueue({ op: 'save', workoutId: 'w1', set: serie('a'), at: 1 }),
    enqueue({ op: 'save', workoutId: 'w1', set: serie('b'), at: 1 }),
    enqueue({ op: 'save', workoutId: 'w1', set: serie('c'), at: 1 }),
  ]);
  expect((await loadOutbox()).length).toBe(3);
});

describe('applyOutbox', () => {
  const detalle = {
    id: 'w1',
    exercises: [{ id: 'ex1', workout_id: 'w1', position: 0, name: 'Banca', sets: null, reps: null, weight: null, duration_minutes: null, notes: null, workout_sets: [serie('s1'), serie('s2', { sort_order: 2 })] }],
  };

  it('pinta lo pendiente sobre lo del servidor: cambios, borrados y series nuevas', () => {
    const r = applyOutbox(detalle, [
      { op: 'save', workoutId: 'w1', set: serie('s1', { rir: 2 }), at: 1 },
      { op: 'remove', workoutId: 'w1', setId: 's2', at: 1 },
      { op: 'save', workoutId: 'w1', set: serie('s3', { sort_order: 3 }), at: 1 },
    ]);
    expect(r.exercises[0].workout_sets.map((s) => [s.id, s.rir])).toEqual([['s1', 2], ['s3', null]]);
  });

  it('lo de otra sesión no se mezcla', () => {
    expect(applyOutbox(detalle, [{ op: 'remove', workoutId: 'otra', setId: 's1', at: 1 }])).toBe(detalle);
  });
});
