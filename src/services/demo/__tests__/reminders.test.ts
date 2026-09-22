/**
 * Recordatorios (RF-C10, RF-S10).
 *
 * `setForActivity` reemplaza el conjunto completo de offsets —no anade— y los
 * destinatarios se sincronizan solos: dueno mas invitados con share aceptado.
 * `listUpcoming` es lo que alimenta la pantalla de avisos.
 */
import { addDays, addHours } from 'date-fns';

import { toIso } from '@/lib/dates';
import type { ActivitiesApi, RemindersApi, SharesApi } from '@/services/contracts';

const YO = 'demo-user';
const ANA = 'demo-ana';

type Store = typeof import('@/services/demo/store');

function fresh(): {
  recordatorios: RemindersApi;
  actividades: ActivitiesApi;
  shares: SharesApi;
  state: Store['demoState'];
} {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const rm = require('@/services/demo/reminders') as typeof import('@/services/demo/reminders');
  const ac = require('@/services/demo/activities') as typeof import('@/services/demo/activities');
  const sh = require('@/services/demo/shares') as typeof import('@/services/demo/shares');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    recordatorios: rm.demoReminders,
    actividades: ac.demoActivities,
    shares: sh.demoShares,
    state: store.demoState,
  };
}

/** Mañana, para que caiga dentro del horizonte de `listUpcoming`. */
const manana = () => {
  const d = addDays(new Date(), 1);
  d.setHours(10, 0, 0, 0);
  return d;
};

const nueva = (inicio = manana()) => ({
  title: 'Junta',
  start_at: toIso(inicio),
  end_at: toIso(addHours(inicio, 1)),
});

describe('definir recordatorios', () => {
  it('crea uno por cada offset', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());

    const r = await recordatorios.setForActivity(act.id, YO, [10, 60]);

    expect(r).toHaveLength(2);
    expect(r.map((x) => x.offset_minutes)).toEqual([10, 60]);
  });

  it('los devuelve ordenados por antelacion', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());

    const r = await recordatorios.setForActivity(act.id, YO, [60, 5, 30]);

    expect(r.map((x) => x.offset_minutes)).toEqual([5, 30, 60]);
  });

  it('reemplaza el conjunto en vez de acumular', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10, 60]);

    const r = await recordatorios.setForActivity(act.id, YO, [30]);

    expect(r.map((x) => x.offset_minutes)).toEqual([30]);
  });

  it('una lista vacia los borra todos', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);

    expect(await recordatorios.setForActivity(act.id, YO, [])).toEqual([]);
  });

  it('conserva los que se repiten entre una llamada y otra', async () => {
    const { recordatorios, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10, 60]);
    const idDe10 = state.reminders.find((r) => r.offset_minutes === 10)!.id;

    await recordatorios.setForActivity(act.id, YO, [10, 30]);

    expect(state.reminders.find((r) => r.offset_minutes === 10)?.id).toBe(idDe10);
  });

  it('solo quien creo la actividad puede definirlos', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());

    await expect(recordatorios.setForActivity(act.id, ANA, [10])).rejects.toThrow(/quien creó/i);
  });

  it('falla con una actividad inexistente', async () => {
    const { recordatorios } = fresh();
    await expect(recordatorios.setForActivity('no-existe', YO, [10])).rejects.toThrow(/ya no existe/i);
  });
});

describe('listar por actividad', () => {
  it('nacen habilitados', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [15]);

    expect((await recordatorios.listByActivity(act.id, YO))[0]?.enabled).toBe(true);
  });

  it('vacio si la actividad no tiene ninguno', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    expect(await recordatorios.listByActivity(act.id, YO)).toEqual([]);
  });
});

describe('habilitar y deshabilitar', () => {
  it('cada persona decide por su cuenta', async () => {
    const { recordatorios, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);
    const id = state.reminders[0]!.id;

    await recordatorios.setEnabled(id, YO, false);

    expect((await recordatorios.listByActivity(act.id, YO))[0]?.enabled).toBe(false);
  });

  it('se puede volver a habilitar', async () => {
    const { recordatorios, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);
    const id = state.reminders[0]!.id;

    await recordatorios.setEnabled(id, YO, false);
    await recordatorios.setEnabled(id, YO, true);

    expect((await recordatorios.listByActivity(act.id, YO))[0]?.enabled).toBe(true);
  });

  it('desactivarlo yo no lo desactiva para los demas', async () => {
    const { recordatorios, actividades, shares, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);
    await shares.shareActivity(YO, act.id, [ANA]);
    const share = state.activityShares.find((s) => s.activity_id === act.id)!;
    await shares.respond(ANA, share.id, true);
    const id = state.reminders[0]!.id;

    await recordatorios.setEnabled(id, YO, false);

    expect((await recordatorios.listByActivity(act.id, ANA))[0]?.enabled).toBe(true);
  });
});

describe('proximos recordatorios', () => {
  it('devuelve los de actividades futuras dentro del horizonte', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);

    const proximos = await recordatorios.listUpcoming(YO, 7);

    expect(proximos.map((p) => p.activityId)).toContain(act.id);
  });

  it('el aviso se programa antes del inicio, segun el offset', async () => {
    const { recordatorios, actividades } = fresh();
    const inicio = manana();
    const act = await actividades.create(YO, nueva(inicio));
    await recordatorios.setForActivity(act.id, YO, [30]);

    const p = (await recordatorios.listUpcoming(YO, 7)).find((x) => x.activityId === act.id)!;

    expect(new Date(p.fireAt).getTime()).toBe(inicio.getTime() - 30 * 60_000);
  });

  it('ignora las actividades ya pasadas', async () => {
    const { recordatorios, actividades } = fresh();
    const ayer = addDays(new Date(), -1);
    const act = await actividades.create(YO, nueva(ayer));
    await recordatorios.setForActivity(act.id, YO, [10]);

    const proximos = await recordatorios.listUpcoming(YO, 7);

    expect(proximos.map((p) => p.activityId)).not.toContain(act.id);
  });

  it('ignora lo que cae mas alla del horizonte', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva(addDays(new Date(), 30)));
    await recordatorios.setForActivity(act.id, YO, [10]);

    expect((await recordatorios.listUpcoming(YO, 7)).map((p) => p.activityId)).not.toContain(act.id);
  });

  it('omite los que desactive', async () => {
    const { recordatorios, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);
    await recordatorios.setEnabled(state.reminders[0]!.id, YO, false);

    expect((await recordatorios.listUpcoming(YO, 7)).map((p) => p.activityId)).not.toContain(act.id);
  });

  it('el cuerpo dice la hora de inicio', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);

    const p = (await recordatorios.listUpcoming(YO, 7)).find((x) => x.activityId === act.id)!;

    expect(p.body).toMatch(/Empieza a las \d{2}:\d{2}/);
  });

  it('en una actividad de todo el dia dice "Hoy" en vez de la hora', async () => {
    const { recordatorios, actividades } = fresh();
    const act = await actividades.create(YO, { ...nueva(), all_day: true });
    await recordatorios.setForActivity(act.id, YO, [10]);

    const p = (await recordatorios.listUpcoming(YO, 7)).find((x) => x.activityId === act.id)!;

    expect(p.body).toContain('Hoy');
  });

  it('en una actividad ajena indica quien la comparte', async () => {
    const { recordatorios, actividades, shares, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(act.id, YO, [10]);
    await shares.shareActivity(YO, act.id, [ANA]);
    const share = state.activityShares.find((s) => s.activity_id === act.id)!;
    await shares.respond(ANA, share.id, true);

    const p = (await recordatorios.listUpcoming(ANA, 7)).find((x) => x.activityId === act.id)!;

    expect(p.body).toContain('Compartida por');
  });

  it('vienen ordenados por cuando se disparan', async () => {
    const { recordatorios, actividades } = fresh();
    const a = await actividades.create(YO, nueva(addDays(manana(), 2)));
    const b = await actividades.create(YO, nueva());
    await recordatorios.setForActivity(a.id, YO, [10]);
    await recordatorios.setForActivity(b.id, YO, [10]);

    const fechas = (await recordatorios.listUpcoming(YO, 14)).map((p) => p.fireAt);

    expect([...fechas].sort()).toEqual(fechas);
  });
});
