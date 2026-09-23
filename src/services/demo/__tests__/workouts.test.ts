/**
 * CRUD de entrenamientos y sus ejercicios (spec 07). Se cubren dos reglas de
 * negocio que no son evidentes: la duracion total es derivada, no se guarda
 * (RF-F3), y una actividad no puede tener dos entrenamientos.
 */
import type { WorkoutsApi } from '@/services/contracts';
import type { WorkoutInput } from '@/types/domain';

const USER = 'demo-user';

function fresh(): WorkoutsApi {
  jest.resetModules();
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const mod = require('@/services/demo/workouts') as typeof import('@/services/demo/workouts');
  return mod.demoWorkouts;
}

const input = (over: Partial<WorkoutInput> = {}): WorkoutInput => ({
  performed_at: new Date(2026, 8, 7, 7, 30, 0, 0).toISOString(),
  ...over,
});

describe('crear', () => {
  it('devuelve el entrenamiento con id y dueno', async () => {
    const workouts = fresh();
    const created = await workouts.create(USER, input({ notes: 'Pierna' }));

    expect(created.id).toEqual(expect.any(String));
    expect(created.owner_id).toBe(USER);
    expect(created.notes).toBe('Pierna');
  });

  it('nace sin ejercicios y sin duracion', async () => {
    const workouts = fresh();
    const created = await workouts.create(USER, input());

    expect(created.exercise_count).toBe(0);
    expect(created.duration_minutes).toBeNull();
  });

  it('guarda el nombre que se le da (RF-F7)', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input({ title: 'Empuje A' }));
    expect(w.title).toBe('Empuje A');
  });

  it('recorta los espacios del nombre', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input({ title: '  Pierna  ' }));
    expect(w.title).toBe('Pierna');
  });

  it('un nombre en blanco se guarda como sin nombre, no como cadena vacia', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input({ title: '   ' }));
    expect(w.title).toBeNull();
  });

  it('sin nombre nace sin el', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());
    expect(w.title).toBeNull();
  });

  it('se puede cambiar despues', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());
    const cambiado = await workouts.update(w.id, { title: 'Pierna' });
    expect(cambiado.title).toBe('Pierna');
  });

  it('rechaza un segundo entrenamiento para la misma actividad', async () => {
    const workouts = fresh();
    await workouts.create(USER, input({ activity_id: 'act-1' }));

    await expect(workouts.create(USER, input({ activity_id: 'act-1' }))).rejects.toThrow(/ya tiene un entrenamiento/i);
  });
});

describe('leer', () => {
  it('list solo devuelve los propios', async () => {
    const workouts = fresh();
    const mio = await workouts.create(USER, input());
    const ajeno = await workouts.create('otra-persona', input());

    const ids = (await workouts.list(USER)).map((w) => w.id);
    expect(ids).toContain(mio.id);
    expect(ids).not.toContain(ajeno.id);
  });

  it('list ordena del mas reciente al mas antiguo', async () => {
    const workouts = fresh();
    await workouts.create(USER, input({ performed_at: new Date(2026, 0, 1).toISOString() }));
    await workouts.create(USER, input({ performed_at: new Date(2026, 5, 1).toISOString() }));

    const fechas = (await workouts.list(USER)).map((w) => w.performed_at);
    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  it('getById falla con un id inexistente', async () => {
    const workouts = fresh();
    await expect(workouts.getById('no-existe')).rejects.toThrow(/ya no existe/i);
  });

  it('getByActivity devuelve null cuando la actividad no tiene entrenamiento', async () => {
    const workouts = fresh();
    expect(await workouts.getByActivity('act-sin-nada', USER)).toBeNull();
  });
});

describe('actualizar', () => {
  it('cambia las notas', async () => {
    const workouts = fresh();
    const created = await workouts.create(USER, input({ notes: 'Antes' }));

    expect((await workouts.update(created.id, { notes: 'Despues' })).notes).toBe('Despues');
  });

  it('conserva las notas si el patch no las menciona', async () => {
    const workouts = fresh();
    const created = await workouts.create(USER, input({ notes: 'Se queda' }));

    const updated = await workouts.update(created.id, { performed_at: new Date(2026, 9, 1).toISOString() });
    expect(updated.notes).toBe('Se queda');
  });
});

describe('ejercicios', () => {
  it('se anaden con posicion incremental', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());

    const a = await workouts.addExercise(w.id, { name: 'Sentadilla', sets: 4, reps: '8', weight: '80 kg', duration_minutes: null, notes: null });
    const b = await workouts.addExercise(w.id, { name: 'Prensa', sets: 3, reps: '12', weight: '160 kg', duration_minutes: null, notes: null });

    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
  });

  it('recortan los espacios del nombre', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());

    const ex = await workouts.addExercise(w.id, { name: '  Plancha  ', sets: null, reps: null, weight: null, duration_minutes: null, notes: null });
    expect(ex.name).toBe('Plancha');
  });

  it('suben el conteo del entrenamiento', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());
    await workouts.addExercise(w.id, { name: 'Remo', sets: null, reps: null, weight: null, duration_minutes: null, notes: null });

    expect((await workouts.getById(w.id)).exercise_count).toBe(1);
  });

  it('la duracion total es la suma de los ejercicios, no un campo guardado (RF-F3)', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());
    await workouts.addExercise(w.id, { name: 'Plancha', sets: null, reps: null, weight: null, duration_minutes: 5, notes: null });
    await workouts.addExercise(w.id, { name: 'Bici', sets: null, reps: null, weight: null, duration_minutes: 20, notes: null });

    expect((await workouts.getById(w.id)).duration_minutes).toBe(25);
  });

  it('se pueden editar', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());
    const ex = await workouts.addExercise(w.id, { name: 'Sentadilla', sets: 3, reps: '10', weight: '60 kg', duration_minutes: null, notes: null });

    const updated = await workouts.updateExercise(ex.id, { sets: 5, weight: '90 kg' });
    expect(updated.sets).toBe(5);
    expect(updated.weight).toBe('90 kg');
    expect(updated.name).toBe('Sentadilla');
  });

  it('al eliminarlos baja el conteo', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());
    const ex = await workouts.addExercise(w.id, { name: 'Fondo', sets: null, reps: null, weight: null, duration_minutes: null, notes: null });

    await workouts.removeExercise(ex.id);
    expect((await workouts.getById(w.id)).exercise_count).toBe(0);
  });

  it('no se pueden anadir a un entrenamiento inexistente', async () => {
    const workouts = fresh();
    await expect(
      workouts.addExercise('no-existe', { name: 'X', sets: null, reps: null, weight: null, duration_minutes: null, notes: null }),
    ).rejects.toThrow(/ya no existe/i);
  });
});

describe('eliminar', () => {
  it('lo saca de la lista', async () => {
    const workouts = fresh();
    const created = await workouts.create(USER, input());

    await workouts.remove(created.id);

    expect((await workouts.list(USER)).map((w) => w.id)).not.toContain(created.id);
  });

  it('arrastra sus ejercicios', async () => {
    const workouts = fresh();
    const w = await workouts.create(USER, input());
    const ex = await workouts.addExercise(w.id, { name: 'Curl', sets: null, reps: null, weight: null, duration_minutes: null, notes: null });

    await workouts.remove(w.id);

    // El ejercicio ya no puede editarse: se fue con su entrenamiento.
    await expect(workouts.updateExercise(ex.id, { sets: 1 })).rejects.toThrow(/ya no existe/i);
  });
});
