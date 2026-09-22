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

  it('eliminar borra por id', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.remove('w1');
    expect(mockSb.secuencia).toContain('delete');
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

  it('eliminar borra por id', async () => {
    mockSb.responder({ data: null, error: null });
    await supabaseWorkouts.removeExercise('e1');
    expect(mockSb.secuencia).toContain('delete');
  });
});

describe('exerciseNames (RF-F4)', () => {
  it('solo ve los del propio usuario', async () => {
    mockSb.responder({ data: [], error: null });
    await supabaseWorkouts.exerciseNames('u1');
    expect(mockSb.argsDe('eq')).toEqual(['workouts.owner_id', 'u1']);
  });

  it('quita duplicados y ordena alfabeticamente', async () => {
    mockSb.responder({ data: [{ name: 'Prensa' }, { name: 'Sentadilla' }, { name: 'Prensa' }], error: null });
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

  it('un entrenamiento sin ejercicios no inserta la segunda tanda', async () => {
    mockSb.encolar({ data: fila({ exercises: [] }), error: null }, { data: { id: 'w2' }, error: null }, { data: fila({ id: 'w2' }), error: null });

    await supabaseWorkouts.duplicate('u1', 'w1', { activityId: null, performedAt: 'y', keepValues: true });

    expect(mockSb.llamadas.filter((l) => l[0] === 'insert')).toHaveLength(1);
  });
});
