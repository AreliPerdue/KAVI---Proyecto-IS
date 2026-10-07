/**
 * Gym v2 contra Supabase (spec 07 v2): historial por ejercicio, notas, registro de la racha y
 * decisiones. Lo que no se ve en el esquema: qué se filtra en la consulta y qué en el cliente.
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseWorkouts } = require('@/services/supabase/workouts') as typeof import('@/services/supabase/workouts');

const ok = (data: unknown) => ({ data, error: null });
const viva = { performed_at: '2026-10-05T18:00:00Z', title: 'Pierna', deleted_at: null, status: 'completed' };

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder(ok([]));
});

describe('historial de un ejercicio', () => {
  it('ligado al catálogo: por exercise_id, sin borrados ni descartados', async () => {
    await supabaseWorkouts.exerciseHistory('u1', { exerciseId: 'cat-banca', name: 'Banca' });
    expect(mockSb.llamadas).toContainEqual(['eq', 'exercise_id', 'cat-banca']);
    expect(mockSb.llamadas).toContainEqual(['is', 'workouts.deleted_at', null]);
    expect(mockSb.llamadas).toContainEqual(['neq', 'workouts.status', 'discarded']);
  });

  it('sin ligar: por nombre exacto, con los comodines escapados', async () => {
    await supabaseWorkouts.exerciseHistory('u1', { exerciseId: null, name: ' Remo 50% ' });
    expect(mockSb.llamadas).toContainEqual(['is', 'exercise_id', null]);
    expect(mockSb.llamadas).toContainEqual(['ilike', 'name', 'Remo 50\\%']);
  });
});

describe('buscar en las notas', () => {
  it('con menos de dos letras no consulta', async () => {
    expect(await supabaseWorkouts.searchNotes('u1', 'a')).toEqual([]);
    expect(mockSb.llamadas).toEqual([]);
  });

  it('busca en los tres niveles y descarta lo borrado o descartado en el cliente', async () => {
    mockSb.encolar(
      ok([
        { id: 'w1', notes: 'hombro', ...viva },
        { id: 'w2', notes: 'hombro', ...viva, status: 'discarded' },
      ]),
      ok([
        { name: 'Banca', notes: 'hombro', deleted_at: null, workout_id: 'w1', workouts: viva },
        { name: 'Curl', notes: 'hombro', deleted_at: 'ayer', workout_id: 'w1', workouts: viva },
      ]),
      ok([{ notes: 'hombro', deleted_at: null, workout_exercises: { name: 'Banca', deleted_at: null, workout_id: 'w1', workouts: viva } }]),
    );
    const hits = await supabaseWorkouts.searchNotes('u1', 'hombro');
    expect(hits.map((h) => [h.where, h.workout_id, h.exercise_name])).toEqual([
      ['session', 'w1', null],
      ['exercise', 'w1', 'Banca'],
      ['set', 'w1', 'Banca'],
    ]);
    expect(mockSb.llamadas.filter((l) => l[0] === 'ilike')).toHaveLength(3);
  });
});

describe('racha', () => {
  it('el registro solo trae sesiones terminadas y sin borrar, de la más vieja a la más nueva', async () => {
    await supabaseWorkouts.trainingLog('u1');
    expect(mockSb.llamadas).toContainEqual(['eq', 'status', 'completed']);
    expect(mockSb.llamadas).toContainEqual(['is', 'deleted_at', null]);
    expect(mockSb.llamadas).toContainEqual(['order', 'performed_at', { ascending: true }]);
  });

  it('las decisiones se guardan con upsert por semana: decidir otra vez reemplaza', async () => {
    await supabaseWorkouts.saveStreakEvents('u1', [{ week_start: '2026-10-05', decision: 'kept', note: null, reasons: ['travel'] }]);
    expect(mockSb.argsDe('upsert')).toEqual([
      [{ week_start: '2026-10-05', decision: 'kept', note: null, reasons: ['travel'], owner_id: 'u1' }],
      { onConflict: 'owner_id,week_start' },
    ]);
  });

  it('sin decisiones no consulta', async () => {
    await supabaseWorkouts.saveStreakEvents('u1', []);
    expect(mockSb.llamadas).toEqual([]);
  });
});
