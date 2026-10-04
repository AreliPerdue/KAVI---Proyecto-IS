/**
 * Entrenamientos contra Supabase (spec 07).
 *
 * Tres reglas de negocio que no se ven en el esquema y aqui quedan fijadas:
 * la duracion total es derivada y no tiene columna (RF-F3); al repetir una sesion
 * las notas nunca se copian, porque pertenecen a la sesion que las escribio
 * (RF-F8); y el autocompletado de nombres solo ve los del propio usuario (RF-F4).
 */
import { fakeSupabase } from '@/services/supabase/__tests__/fake-supabase';

const mockSb = fakeSupabase();
jest.mock('@/lib/supabase', () => ({ getSupabase: () => mockSb.client }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseWorkouts } = require('@/services/supabase/workouts') as typeof import('@/services/supabase/workouts');

const ejercicio = (over = {}) => ({
  id: 'e1', workout_id: 'w1', position: 0, name: 'Sentadilla',
  sets: 4, reps: '8', weight: '80 kg', duration_minutes: null, notes: 'Cinturón', ...over,
});
const fila = (over = {}) => ({
  id: 'w1', owner_id: 'u1', activity_id: null, performed_at: 'x', notes: null, created_at: 'x',
  activity: null, exercises: [ejercicio()], ...over,
});

beforeEach(() => {
  mockSb.llamadas.length = 0;
  mockSb.responder({ data: [], error: null });
});

describe('list', () => {
  it('filtra por dueno y ordena del mas reciente al mas antiguo (RF-F7)', async () => {
    await supabaseWorkouts.list('u1');
    expect(mockSb.argsDe('eq')).toEqual(['owner_id', 'u1']);
    expect(mockSb.argsDe('order')).toEqual(['performed_at', { ascending: false }]);
  });

  it('trae el titulo de la actividad ligada', async () => {
    mockSb.responder({ data: [fila({ activity: { title: 'Gimnasio · pierna' } })], error: null });
    expect((await supabaseWorkouts.list('u1'))[0]?.activity_title).toBe('Gimnasio · pierna');
  });

  it('sin actividad ligada el titulo es null', async () => {
    mockSb.responder({ data: [fila()], error: null });
    expect((await supabaseWorkouts.list('u1'))[0]?.activity_title).toBeNull();
  });

  it('cuenta los ejercicios', async () => {
    mockSb.responder({ data: [fila({ exercises: [ejercicio(), ejercicio({ id: 'e2' })] })], error: null });
    expect((await supabaseWorkouts.list('u1'))[0]?.exercise_count).toBe(2);
  });
});

describe('duracion derivada (RF-F3)', () => {
  it('suma la de los ejercicios', async () => {
    mockSb.responder({
      data: [fila({ exercises: [ejercicio({ duration_minutes: 5 }), ejercicio({ id: 'e2', duration_minutes: 20 })] })],
      error: null,
    });
    expect((await supabaseWorkouts.list('u1'))[0]?.duration_minutes).toBe(25);
  });

  it('sin ninguna duracion anotada es null, no cero', async () => {
    mockSb.responder({ data: [fila()], error: null });
    expect((await supabaseWorkouts.list('u1'))[0]?.duration_minutes).toBeNull();
  });

  it('sin ejercicios tambien es null', async () => {
    mockSb.responder({ data: [fila({ exercises: [] })], error: null });
    expect((await supabaseWorkouts.list('u1'))[0]?.duration_minutes).toBeNull();
  });
});

describe('getById', () => {
  it('devuelve los ejercicios ordenados por posicion', async () => {
    mockSb.responder({
      data: fila({ exercises: [ejercicio({ id: 'b', position: 2 }), ejercicio({ id: 'a', position: 0 })] }),
      error: null,
    });

    const d = await supabaseWorkouts.getById('w1');

    expect(d.exercises.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('avisa si ya no existe', async () => {
    mockSb.responder({ data: null, error: null });
    await expect(supabaseWorkouts.getById('w9')).rejects.toThrow(/ya no existe/i);
  });

  it('traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseWorkouts.getById('w1')).rejects.toThrow(/permiso/i);
  });
});

describe('getByActivity (RF-F1)', () => {
  it('filtra por actividad y dueno', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.getByActivity('a1', 'u1');

    const eqs = mockSb.llamadas.filter((l) => l[0] === 'eq');
    expect(eqs).toContainEqual(['eq', 'activity_id', 'a1']);
    expect(eqs).toContainEqual(['eq', 'owner_id', 'u1']);
  });

  it('devuelve null si la actividad no tiene entrenamiento', async () => {
    mockSb.responder({ data: null, error: null });
    expect(await supabaseWorkouts.getByActivity('a1', 'u1')).toBeNull();
  });
});

describe('create / update / remove', () => {
  it('crear marca al dueno', async () => {
    mockSb.encolar({ data: { id: 'w1' }, error: null }, { data: fila(), error: null });
    await supabaseWorkouts.create('u1', { performed_at: 'x' });
    expect(mockSb.argsDe('insert')).toEqual([{ performed_at: 'x', owner_id: 'u1' }]);
  });

  it('actualizar filtra por id y envia el parche', async () => {
    mockSb.responder({ data: fila(), error: null });
    await supabaseWorkouts.update('w1', { notes: 'Buena sesión' });
    expect(mockSb.argsDe('update')).toEqual([{ notes: 'Buena sesión' }]);
    expect(mockSb.argsDe('eq')).toEqual(['id', 'w1']);
  });

  it('eliminar es suave y suelta la actividad (RF-F16)', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.remove('w1');
    expect(mockSb.secuencia).not.toContain('delete');
    const cambios = mockSb.argsDe('update')?.[0] as { deleted_at: string; activity_id: null };
    expect(cambios.deleted_at).toEqual(expect.any(String));
    expect(cambios.activity_id).toBeNull();
    expect(mockSb.argsDe('eq')).toEqual(['id', 'w1']);
  });

  it('descartar también suelta la actividad, para poder registrar otra', async () => {
    mockSb.responder({ data: fila(), error: null });
    await supabaseWorkouts.update('w1', { status: 'discarded' });
    expect(mockSb.argsDe('update')).toEqual([{ status: 'discarded', activity_id: null }]);
  });

  it('eliminar traduce el error', async () => {
    mockSb.responder({ data: null, error: { message: 'x', code: '42501' } });
    await expect(supabaseWorkouts.remove('w1')).rejects.toThrow(/permiso/i);
  });
});

describe('ejercicios', () => {
  it('calcula la siguiente posicion si no se indica', async () => {
    mockSb.encolar({ data: [{ position: 3 }], error: null }, { data: ejercicio(), error: null });

    await supabaseWorkouts.addExercise('w1', { name: 'Prensa', sets: null, reps: null, weight: null, duration_minutes: null, notes: null });

    expect((mockSb.argsDe('insert')?.[0] as { position: number }).position).toBe(4);
  });

  it('el primero va en la posicion 0', async () => {
    mockSb.encolar({ data: [], error: null }, { data: ejercicio(), error: null });

    await supabaseWorkouts.addExercise('w1', { name: 'Prensa', sets: null, reps: null, weight: null, duration_minutes: null, notes: null });

    expect((mockSb.argsDe('insert')?.[0] as { position: number }).position).toBe(0);
  });

  it('respeta una posicion explicita sin consultar', async () => {
    mockSb.responder({ data: ejercicio(), error: null });

    await supabaseWorkouts.addExercise('w1', { name: 'X', position: 7, sets: null, reps: null, weight: null, duration_minutes: null, notes: null });

    expect((mockSb.argsDe('insert')?.[0] as { position: number }).position).toBe(7);
  });

  it('actualizar filtra por id', async () => {
    mockSb.responder({ data: ejercicio(), error: null });
    await supabaseWorkouts.updateExercise('e1', { sets: 5 });
    expect(mockSb.argsDe('eq')).toEqual(['id', 'e1']);
  });

  it('eliminar es suave: marca deleted_at (RF-F16)', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.removeExercise('e1');
    expect(mockSb.secuencia).not.toContain('delete');
    expect((mockSb.argsDe('update')?.[0] as { deleted_at: string }).deleted_at).toEqual(expect.any(String));
  });

  it('restaurar quita la marca de borrado (deshacer, RF-F6)', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.restoreExercise('e1');
    expect(mockSb.argsDe('update')).toEqual([{ deleted_at: null }]);
    expect(mockSb.argsDe('eq')).toEqual(['id', 'e1']);
  });
});

describe('exerciseNames (RF-F4)', () => {
  it('solo ve los del propio usuario y no los borrados', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseWorkouts.exerciseNames('u1');
    expect(mockSb.argsDe('eq')).toEqual(['owner_id', 'u1']);
    expect(mockSb.argsDe('is')).toEqual(['deleted_at', null]);
  });

  it('quita duplicados y ordena del mas usado al menos, como el demo', async () => {
    mockSb.responder({ data: [{ name: 'Sentadilla' }, { name: 'Prensa' }, { name: 'Prensa' }, { name: '' }], error: null });
    expect(await supabaseWorkouts.exerciseNames('u1')).toEqual(['Prensa', 'Sentadilla']);
  });

  it('sin historial devuelve lista vacia', async () => {
    mockSb.responder({ data: [], error: null });
    expect(await supabaseWorkouts.exerciseNames('u1')).toEqual([]);
  });
});

describe('duplicate (RF-F8)', () => {
  const origen = fila({ exercises: [ejercicio({ duration_minutes: 10 })] });

  it('con keepValues copia series, repeticiones y peso', async () => {
    mockSb.encolar({ data: origen, error: null }, { data: { id: 'w2' }, error: null }, { data: null, error: null }, { data: fila({ id: 'w2' }), error: null });

    await supabaseWorkouts.duplicate('u1', 'w1', { activityId: null, performedAt: 'y', keepValues: true });

    const insertados = mockSb.llamadas.filter((l) => l[0] === 'insert').at(-1)?.[1] as { sets: number | null }[];
    expect(insertados[0]?.sets).toBe(4);
  });

  it('sin keepValues solo viajan los nombres', async () => {
    mockSb.encolar({ data: origen, error: null }, { data: { id: 'w2' }, error: null }, { data: null, error: null }, { data: fila({ id: 'w2' }), error: null });

    await supabaseWorkouts.duplicate('u1', 'w1', { activityId: null, performedAt: 'y', keepValues: false });

    const insertados = mockSb.llamadas.filter((l) => l[0] === 'insert').at(-1)?.[1] as { name: string; sets: number | null; weight: string | null }[];
    expect(insertados[0]?.name).toBe('Sentadilla');
    expect(insertados[0]?.sets).toBeNull();
    expect(insertados[0]?.weight).toBeNull();
  });

  it('las notas nunca se copian: son de la sesion que las escribio', async () => {
    mockSb.encolar({ data: origen, error: null }, { data: { id: 'w2' }, error: null }, { data: null, error: null }, { data: fila({ id: 'w2' }), error: null });

    await supabaseWorkouts.duplicate('u1', 'w1', { activityId: null, performedAt: 'y', keepValues: true });

    const nuevo = mockSb.llamadas.filter((l) => l[0] === 'insert')[0]?.[1] as { notes: string | null };
    const ejercicios = mockSb.llamadas.filter((l) => l[0] === 'insert').at(-1)?.[1] as { notes: string | null }[];
    expect(nuevo.notes).toBeNull();
    expect(ejercicios[0]?.notes).toBeNull();
  });

  it('copia el nombre de la sesion (v1 lo perdia)', async () => {
    mockSb.encolar({ data: fila({ title: 'Pierna' }), error: null }, { data: { id: 'w2' }, error: null }, { data: null, error: null }, { data: fila({ id: 'w2' }), error: null });

    await supabaseWorkouts.duplicate('u1', 'w1', { activityId: null, performedAt: 'y', keepValues: false });

    expect((mockSb.llamadas.filter((l) => l[0] === 'insert')[0]?.[1] as { title: string }).title).toBe('Pierna');
  });

  it('con keepValues las series viajan como pendientes, con ids nuevos', async () => {
    const serie = {
      id: 's1', workout_exercise_id: 'e1', sort_order: 1, set_type: 'working', intensifiers: [], target: null, rpe: null, rir: 2,
      failure: null, tempo: null, rom: null, side: null, load_mods: null, gear: [], spotter: false, rest_after_sec: 90,
      completed_at: '2026-09-20T07:30:00Z', notes: 'pesado', tags: [], from_legacy: false, deleted_at: null,
      set_segments: [{ id: 'g1', set_id: 's1', sort_order: 0, kind: 'main', weight_kg: 80, input_unit: 'kg', reps: 8, reps_left: null, reps_right: null, partial_reps: null, forced_reps: null, cheat_reps: null, duration_sec: null, distance_m: null, rest_before_sec: null, variant_exercise_id: null, notes: null, deleted_at: null }],
    };
    mockSb.encolar(
      { data: fila({ exercises: [ejercicio({ workout_sets: [serie] })] }), error: null },
      { data: { id: 'w2' }, error: null },
      { data: null, error: null },
    );
    mockSb.responder({ data: null, error: null });

    await supabaseWorkouts.duplicate('u1', 'w1', { activityId: null, performedAt: 'y', keepValues: true }).catch(() => undefined);

    const upserts = mockSb.llamadas.filter((l) => l[0] === 'upsert');
    const series = upserts[0]?.[1] as { id: string; completed_at: string | null; notes: string | null; rir: number }[];
    expect(series[0].id).not.toBe('s1');
    expect(series[0].completed_at).toBeNull();
    expect(series[0].notes).toBeNull();
    expect(series[0].rir).toBe(2);
    const segmentos = upserts[1]?.[1] as { set_id: string; weight_kg: number }[];
    expect(segmentos[0].set_id).toBe(series[0].id);
    expect(segmentos[0].weight_kg).toBe(80);
  });

  it('un entrenamiento sin ejercicios no inserta la segunda tanda', async () => {
    mockSb.encolar({ data: fila({ exercises: [] }), error: null }, { data: { id: 'w2' }, error: null }, { data: fila({ id: 'w2' }), error: null });

    await supabaseWorkouts.duplicate('u1', 'w1', { activityId: null, performedAt: 'y', keepValues: true });

    expect(mockSb.llamadas.filter((l) => l[0] === 'insert')).toHaveLength(1);
  });
});

describe('series y segmentos (RF-F14 – RF-F18)', () => {
  const segmento = (over = {}) => ({
    id: 'g1', set_id: 's1', sort_order: 0, kind: 'main' as const, weight_kg: 100, input_unit: 'kg' as const, reps: 8,
    reps_left: null, reps_right: null, partial_reps: null, forced_reps: null, cheat_reps: null, duration_sec: null,
    distance_m: null, rest_before_sec: null, variant_exercise_id: null, notes: null, ...over,
  });
  const serie = (over = {}) => ({
    id: 's1', workout_exercise_id: 'e1', sort_order: 1, set_type: 'working' as const, intensifiers: [], target: null,
    rpe: null, rir: null, failure: null, tempo: null, rom: null, side: null, load_mods: null, gear: [], spotter: false,
    rest_after_sec: null, completed_at: null, notes: 'una nota', tags: [], from_legacy: false, segments: [segmento()], ...over,
  });

  it('guardar hace upsert por id: reenviar tras un cierre no duplica', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.saveSets([serie()]);
    const upserts = mockSb.llamadas.filter((l) => l[0] === 'upsert');
    expect(upserts[0]?.[2]).toEqual({ onConflict: 'id' });
    expect(upserts[1]?.[2]).toEqual({ onConflict: 'id' });
  });

  it('manda la fila completa: una columna ausente se volveria null', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.saveSets([serie()]);
    const fila = (mockSb.llamadas.find((l) => l[0] === 'upsert')?.[1] as Record<string, unknown>[])[0];
    expect(fila.notes).toBe('una nota');
    expect(fila).not.toHaveProperty('segments');
    expect(fila).not.toHaveProperty('owner_id');
    expect(fila.deleted_at).toBeNull();
  });

  it('los segmentos que ya no vienen se borran (quitar un drop)', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.saveSets([serie({ segments: [segmento()] })]);
    const nots = mockSb.llamadas.filter((l) => l[0] === 'not');
    expect(nots).toContainEqual(['not', 'id', 'in', '(g1)']);
    expect(mockSb.llamadas).toContainEqual(['in', 'set_id', ['s1']]);
  });

  it('sin series no toca la base', async () => {
    await supabaseWorkouts.saveSets([]);
    expect(mockSb.llamadas).toHaveLength(0);
  });

  it('borrar series es suave', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.removeSets(['s1', 's2']);
    expect(mockSb.secuencia).not.toContain('delete');
    expect(mockSb.llamadas).toContainEqual(['in', 'id', ['s1', 's2']]);
  });

  it('el detalle trae series y segmentos ordenados y sin lo borrado', async () => {
    mockSb.responder({
      data: fila({
        exercises: [ejercicio({
          workout_sets: [
            { ...serie({ id: 's2', sort_order: 2 }), segments: undefined, deleted_at: null, set_segments: [segmento({ id: 'g3', sort_order: 1 }), segmento({ id: 'g2', sort_order: 0 })] },
            { ...serie({ id: 's1', sort_order: 1 }), segments: undefined, deleted_at: null, set_segments: [] },
            { ...serie({ id: 'sx', sort_order: 0 }), segments: undefined, deleted_at: '2026-10-01', set_segments: [] },
          ],
        })],
      }),
      error: null,
    });
    const d = await supabaseWorkouts.getById('w1');
    expect(d.exercises[0].workout_sets.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(d.exercises[0].workout_sets[1].segments.map((g) => g.id)).toEqual(['g2', 'g3']);
  });
});

describe('conversion de v1 (RF-F62)', () => {
  it('lista solo ejercicios con texto, sin convertir, de sesiones vivas', async () => {
    mockSb.responder({
      data: [
        { ...ejercicio({ id: 'con-texto' }), workouts: { performed_at: '2026-09-20' } },
        { ...ejercicio({ id: 'solo-nombre', sets: null, reps: null, weight: null }), workouts: { performed_at: '2026-09-20' } },
      ],
      error: null,
    });
    const r = await supabaseWorkouts.listLegacyExercises('u1');
    expect(r.map((e) => e.id)).toEqual(['con-texto']);
    expect(r[0].performed_at).toBe('2026-09-20');
    expect(mockSb.llamadas).toContainEqual(['is', 'legacy_converted_at', null]);
    expect(mockSb.llamadas).toContainEqual(['is', 'workouts.deleted_at', null]);
  });

  it('marcar convertidos escribe la fecha', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.markLegacyConverted(['e1']);
    expect((mockSb.argsDe('update')?.[0] as { legacy_converted_at: string }).legacy_converted_at).toEqual(expect.any(String));
  });
});
