/**
 * CRUD de actividades sobre el backend demo (memoria), que implementa el mismo
 * contrato `ActivitiesApi` que Supabase. Cada prueba arranca con estado limpio:
 * `demoState` es un singleton de modulo, asi que se recarga con `resetModules`.
 */
import { addDays, addHours } from 'date-fns';

import { toIso } from '@/lib/dates';
import type { ActivitiesApi } from '@/services/contracts';
import type { Activity, ActivityInput } from '@/types/domain';

const USER = 'demo-user';

type Store = typeof import('@/services/demo/store');

/**
 * `demoState` es un singleton de modulo: para aislar cada prueba hay que
 * descartar el registro y volver a cargarlo. `require` (y no `import()`) porque
 * el import dinamico exigiria --experimental-vm-modules.
 */
function freshApi(): { activities: ActivitiesApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const mod = require('@/services/demo/activities') as typeof import('@/services/demo/activities');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { activities: mod.demoActivities, state: store.demoState };
}

const base = new Date(2026, 8, 7, 9, 0, 0, 0); // lunes 7 sep 2026, 09:00 local

function input(over: Partial<ActivityInput> = {}): ActivityInput {
  return {
    title: 'Junta de equipo',
    start_at: toIso(base),
    end_at: toIso(addHours(base, 1)),
    ...over,
  };
}

/** Rango amplio para que `listByRange` no filtre por fecha. */
const WIDE = { from: toIso(addDays(base, -400)), to: toIso(addDays(base, 400)) };

describe('crear', () => {
  it('devuelve la actividad con id, dueno y marcas de tiempo', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input());

    expect(created.id).toEqual(expect.any(String));
    expect(created.owner_id).toBe(USER);
    expect(created.title).toBe('Junta de equipo');
    expect(created.created_at).toEqual(expect.any(String));
  });

  it('aplica los valores por defecto de los campos opcionales', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input());

    expect(created.description).toBeNull();
    expect(created.theme_id).toBeNull();
    expect(created.all_day).toBe(false);
    expect(created.is_gym).toBe(false);
    expect(created.recurrence_rule).toBeNull();
    expect(created.recurrence_parent_id).toBeNull();
  });

  it('queda recuperable por listByRange', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input({ title: 'Unica' }));

    const listed = await activities.listByRange(USER, WIDE.from, WIDE.to);
    expect(listed.map((a) => a.id)).toContain(created.id);
  });

  it('con recurrencia materializa las instancias de la serie', async () => {
    const { activities, state } = freshApi();
    const parent = await activities.create(USER, {
      ...input({ title: 'Diaria' }),
      recurrence: { freq: 'DAILY', byDay: [], until: toIso(addDays(base, 4)).slice(0, 10) },
    });

    const children = state.activities.filter((a) => a.recurrence_parent_id === parent.id);
    expect(children.length).toBeGreaterThan(0);
    expect(parent.recurrence_rule).toContain('FREQ=DAILY');
    // Las instancias no repiten la regla: solo la madre la lleva.
    expect(children.every((c: Activity) => c.recurrence_rule === null)).toBe(true);
  });
});

describe('leer', () => {
  it('getById devuelve la actividad creada', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input({ title: 'Buscar esta' }));

    expect((await activities.getById(created.id)).title).toBe('Buscar esta');
  });

  it('getById falla con un id inexistente', async () => {
    const { activities } = freshApi();
    await expect(activities.getById('no-existe')).rejects.toThrow(/ya no existe/i);
  });

  it('listByRange excluye lo que queda fuera del rango', async () => {
    const { activities } = freshApi();
    const lejana = await activities.create(USER, {
      ...input({ title: 'Dentro de un ano' }),
      start_at: toIso(addDays(base, 365)),
      end_at: toIso(addHours(addDays(base, 365), 1)),
    });

    const listed = await activities.listByRange(USER, toIso(base), toIso(addDays(base, 1)));
    expect(listed.map((a) => a.id)).not.toContain(lejana.id);
  });

  it('listByRange incluye lo que se traslapa parcialmente con el rango', async () => {
    const { activities } = freshApi();
    // Empieza antes del rango y termina dentro.
    const cruzada = await activities.create(USER, {
      ...input({ title: 'Cruza la medianoche' }),
      start_at: toIso(addHours(base, -4)),
      end_at: toIso(addHours(base, 2)),
    });

    const listed = await activities.listByRange(USER, toIso(base), toIso(addHours(base, 3)));
    expect(listed.map((a) => a.id)).toContain(cruzada.id);
  });

  it('listByRange no muestra actividades de otra persona', async () => {
    const { activities } = freshApi();
    const ajena = await activities.create('otra-persona', input({ title: 'Privada' }));

    const listed = await activities.listByRange(USER, WIDE.from, WIDE.to);
    expect(listed.map((a) => a.id)).not.toContain(ajena.id);
  });

  it('listByRange devuelve ordenado por hora de inicio', async () => {
    const { activities } = freshApi();
    await activities.create(USER, { ...input({ title: 'Tarde' }), start_at: toIso(addHours(base, 5)), end_at: toIso(addHours(base, 6)) });
    await activities.create(USER, { ...input({ title: 'Temprano' }), start_at: toIso(addHours(base, 1)), end_at: toIso(addHours(base, 2)) });

    const listed = await activities.listByRange(USER, WIDE.from, WIDE.to);
    const starts = listed.map((a) => a.start_at);
    expect([...starts].sort()).toEqual(starts);
  });
});

describe('actualizar', () => {
  it('cambia los campos enviados y conserva el resto', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input({ title: 'Antes', description: 'Notas' }));

    const updated = await activities.update(created.id, { title: 'Despues' });

    expect(updated.title).toBe('Despues');
    expect(updated.description).toBe('Notas');
    expect(updated.id).toBe(created.id);
  });

  it('persiste el cambio', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input({ title: 'Antes' }));
    await activities.update(created.id, { title: 'Despues' });

    expect((await activities.getById(created.id)).title).toBe('Despues');
  });

  it('permite vaciar la descripcion pasando null', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input({ description: 'Tenia texto' }));

    expect((await activities.update(created.id, { description: null })).description).toBeNull();
  });

  it('scope "this" no toca a las hermanas de la serie', async () => {
    const { activities, state } = freshApi();
    const parent = await activities.create(USER, {
      ...input({ title: 'Serie' }),
      recurrence: { freq: 'DAILY', byDay: [], until: toIso(addDays(base, 4)).slice(0, 10) },
    });
    const child = state.activities.find((a) => a.recurrence_parent_id === parent.id) as Activity;

    await activities.update(child.id, { title: 'Solo esta' }, 'this');

    expect((await activities.getById(child.id)).title).toBe('Solo esta');
    expect((await activities.getById(parent.id)).title).toBe('Serie');
  });

  it('falla al actualizar algo que no existe', async () => {
    const { activities } = freshApi();
    await expect(activities.update('no-existe', { title: 'X' })).rejects.toThrow(/ya no existe/i);
  });
});

describe('eliminar', () => {
  it('quita la actividad de listByRange', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input());

    await activities.remove(created.id);

    const listed = await activities.listByRange(USER, WIDE.from, WIDE.to);
    expect(listed.map((a) => a.id)).not.toContain(created.id);
  });

  it('getById falla despues de eliminar', async () => {
    const { activities } = freshApi();
    const created = await activities.create(USER, input());
    await activities.remove(created.id);

    await expect(activities.getById(created.id)).rejects.toThrow(/ya no existe/i);
  });

  it('no afecta a las demas actividades', async () => {
    const { activities } = freshApi();
    const a = await activities.create(USER, input({ title: 'Se va' }));
    const b = await activities.create(USER, input({ title: 'Se queda' }));

    await activities.remove(a.id);

    expect((await activities.getById(b.id)).title).toBe('Se queda');
  });

  it('scope "series" borra la madre y las instancias futuras', async () => {
    const { activities, state } = freshApi();
    const parent = await activities.create(USER, {
      ...input({ title: 'Serie completa' }),
      recurrence: { freq: 'DAILY', byDay: [], until: toIso(addDays(base, 6)).slice(0, 10) },
    });

    await activities.remove(parent.id, 'series');

    const quedan = state.activities.filter(
      (a: Activity) => a.id === parent.id || a.recurrence_parent_id === parent.id,
    );
    expect(quedan).toHaveLength(0);
  });

  it('falla al eliminar algo que no existe', async () => {
    const { activities } = freshApi();
    await expect(activities.remove('no-existe')).rejects.toThrow(/ya no existe/i);
  });
});

describe('series completas (RF-C8)', () => {
  const conRecurrencia = () => ({
    ...input({ title: 'Diaria' }),
    recurrence: { freq: 'DAILY' as const, byDay: [], until: toIso(addDays(base, 6)).slice(0, 10) },
  });

  it('editar la serie cambia la madre', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());

    await activities.update(padre.id, { title: 'Nuevo título' }, 'series');

    expect(state.activities.find((a: Activity) => a.id === padre.id)?.title).toBe('Nuevo título');
  });

  it('editar la serie regenera las instancias', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());
    const antes = state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id).map((a) => a.id);

    await activities.update(padre.id, { title: 'Otro' }, 'series');

    const despues = state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id).map((a) => a.id);
    expect(despues.length).toBeGreaterThan(0);
    expect(despues).not.toEqual(antes);
  });

  it('el titulo nuevo llega a todas las instancias', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());

    await activities.update(padre.id, { title: 'Propagado' }, 'series');

    const hijas = state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id);
    expect(hijas.every((h: Activity) => h.title === 'Propagado')).toBe(true);
  });

  it('quitar la recurrencia deja la actividad suelta', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());

    await activities.update(padre.id, { recurrence: null }, 'series');

    expect(state.activities.find((a: Activity) => a.id === padre.id)?.recurrence_rule).toBeNull();
    expect(state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id)).toHaveLength(0);
  });

  it('editar desde una instancia afecta a la serie entera', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());
    const hija = state.activities.find((a: Activity) => a.recurrence_parent_id === padre.id) as Activity;

    await activities.update(hija.id, { title: 'Desde la instancia' }, 'series');

    expect(state.activities.find((a: Activity) => a.id === padre.id)?.title).toBe('Desde la instancia');
  });

  it('borrar solo la madre deja que la primera instancia herede la serie', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());

    await activities.remove(padre.id, 'this');

    expect(state.activities.find((a: Activity) => a.id === padre.id)).toBeUndefined();
    const nuevaMadre = state.activities.find((a: Activity) => a.recurrence_rule !== null && a.title === 'Diaria');
    expect(nuevaMadre).toBeDefined();
    expect(nuevaMadre?.recurrence_parent_id).toBeNull();
  });

  it('borrar una instancia no toca a las demas', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());
    const hijas = state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id);
    const cuantas = hijas.length;

    await activities.remove((hijas[0] as Activity).id, 'this');

    expect(state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id)).toHaveLength(cuantas - 1);
  });

  it('extender el horizonte no duplica lo que ya existe', async () => {
    const { activities, state } = freshApi();
    const padre = await activities.create(USER, conRecurrencia());
    const antes = state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id).length;

    await activities.extendRecurrenceHorizon(USER);

    expect(state.activities.filter((a: Activity) => a.recurrence_parent_id === padre.id)).toHaveLength(antes);
  });

  it('extender el horizonte ignora las series de otra persona', async () => {
    const { activities, state } = freshApi();
    await activities.create('otra-persona', conRecurrencia());
    const antes = state.activities.length;

    await activities.extendRecurrenceHorizon(USER);

    expect(state.activities).toHaveLength(antes);
  });
});
