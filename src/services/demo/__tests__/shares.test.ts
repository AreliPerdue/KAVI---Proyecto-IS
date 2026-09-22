/**
 * Compartir actividades e invitaciones (RF-S4, RF-S5, RF-S10).
 *
 * Dos reglas que no son evidentes y aqui quedan fijadas: solo quien creo la
 * actividad puede compartirla, y volver a invitar a quien rechazo reabre la
 * invitacion en vez de duplicarla.
 */
import { addHours } from 'date-fns';

import { toIso } from '@/lib/dates';
import type { ActivitiesApi, SharesApi } from '@/services/contracts';

const YO = 'demo-user';
const ANA = 'demo-ana';
const LUIS = 'demo-luis';
const PEDRO = 'demo-pedro';

type Store = typeof import('@/services/demo/store');

function fresh(): { shares: SharesApi; actividades: ActivitiesApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const sh = require('@/services/demo/shares') as typeof import('@/services/demo/shares');
  const ac = require('@/services/demo/activities') as typeof import('@/services/demo/activities');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { shares: sh.demoShares, actividades: ac.demoActivities, state: store.demoState };
}

const base = new Date(2026, 8, 7, 9, 0, 0, 0);
const nueva = (over = {}) => ({
  title: 'Junta',
  start_at: toIso(base),
  end_at: toIso(addHours(base, 1)),
  ...over,
});

describe('compartir una actividad (RF-S4)', () => {
  it('crea la invitacion como pendiente', async () => {
    const { shares, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());

    await shares.shareActivity(YO, act.id, [ANA]);

    const s = state.activityShares.find((x) => x.activity_id === act.id);
    expect(s?.shared_with_id).toBe(ANA);
    expect(s?.status).toBe('pending');
  });

  it('solo quien la creo puede compartirla', async () => {
    const { shares, actividades } = fresh();
    const act = await actividades.create(YO, nueva());

    await expect(shares.shareActivity(ANA, act.id, [PEDRO])).rejects.toThrow(/quien creó/i);
  });

  it('solo se comparte con contactos aceptados', async () => {
    const { shares, actividades } = fresh();
    const act = await actividades.create(YO, nueva());

    await expect(shares.shareActivity(YO, act.id, [LUIS])).rejects.toThrow(/aceptados/i);
  });

  it('compartir dos veces no duplica la invitacion', async () => {
    const { shares, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());

    await shares.shareActivity(YO, act.id, [ANA]);
    await shares.shareActivity(YO, act.id, [ANA]);

    expect(state.activityShares.filter((x) => x.activity_id === act.id)).toHaveLength(1);
  });

  it('reinvitar a quien rechazo reabre la invitacion', async () => {
    const { shares, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await shares.shareActivity(YO, act.id, [ANA]);
    const s = state.activityShares.find((x) => x.activity_id === act.id)!;
    await shares.respond(ANA, s.id, false);
    expect(s.status).toBe('declined');

    await shares.shareActivity(YO, act.id, [ANA]);

    expect(s.status).toBe('pending');
  });

  it('acepta varios contactos de una vez', async () => {
    const { shares, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());

    await shares.shareActivity(YO, act.id, [ANA, PEDRO]);

    expect(state.activityShares.filter((x) => x.activity_id === act.id)).toHaveLength(2);
  });

  it('falla con una actividad inexistente', async () => {
    const { shares } = fresh();
    await expect(shares.shareActivity(YO, 'no-existe', [ANA])).rejects.toThrow();
  });
});

describe('listar shares de una actividad', () => {
  it('incluye el perfil de cada invitado', async () => {
    const { shares, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    await shares.shareActivity(YO, act.id, [ANA]);

    const lista = await shares.listByActivity(act.id);
    expect(lista[0]?.profile.id).toBe(ANA);
    expect(lista[0]?.profile.display_name).toBe('Ana Torres');
  });

  it('vacia si no se ha compartido', async () => {
    const { shares, actividades } = fresh();
    const act = await actividades.create(YO, nueva());
    expect(await shares.listByActivity(act.id)).toEqual([]);
  });
});

describe('invitaciones recibidas (RF-S5)', () => {
  it('solo muestra las pendientes dirigidas a mi', async () => {
    const { shares } = fresh();
    const inv = await shares.listInvitations(YO);
    expect(inv.length).toBeGreaterThan(0);
    for (const i of inv) expect(i.share.status).toBe('pending');
  });

  it('acompana cada invitacion con la actividad y su dueno', async () => {
    const { shares } = fresh();
    const inv = await shares.listInvitations(YO);
    expect(inv[0]?.activity.title).toEqual(expect.any(String));
    expect(inv[0]?.owner.id).toEqual(expect.any(String));
  });

  it('ordena por la fecha de la actividad', async () => {
    const { shares } = fresh();
    const fechas = (await shares.listInvitations(YO)).map((i) => i.activity.start_at);
    expect([...fechas].sort()).toEqual(fechas);
  });

  it('una vez respondida desaparece de la lista', async () => {
    const { shares, state } = fresh();
    const pendiente = state.activityShares.find((s) => s.shared_with_id === YO && s.status === 'pending')!;

    await shares.respond(YO, pendiente.id, true);

    const ids = (await shares.listInvitations(YO)).map((i) => i.share.id);
    expect(ids).not.toContain(pendiente.id);
  });
});

describe('responder invitaciones', () => {
  it('aceptar marca el share como aceptado', async () => {
    const { shares, state } = fresh();
    const s = state.activityShares.find((x) => x.shared_with_id === YO && x.status === 'pending')!;

    await shares.respond(YO, s.id, true);

    expect(s.status).toBe('accepted');
  });

  it('rechazar lo marca como rechazado', async () => {
    const { shares, state } = fresh();
    const s = state.activityShares.find((x) => x.shared_with_id === YO && x.status === 'pending')!;

    await shares.respond(YO, s.id, false);

    expect(s.status).toBe('declined');
  });

  it('nadie mas puede responder por mi', async () => {
    const { shares, state } = fresh();
    const s = state.activityShares.find((x) => x.shared_with_id === YO && x.status === 'pending')!;

    await expect(shares.respond(PEDRO, s.id, true)).rejects.toThrow(/ya no está disponible/i);
  });

  it('al aceptar se heredan los recordatorios de la actividad (RF-S10)', async () => {
    const { shares, actividades, state } = fresh();
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- mismo registro recargado */
    const rem = require('@/services/demo/reminders') as typeof import('@/services/demo/reminders');
    const act = await actividades.create(YO, nueva());
    await rem.demoReminders.setForActivity(act.id, YO, [10]);
    await shares.shareActivity(YO, act.id, [ANA]);
    const s = state.activityShares.find((x) => x.activity_id === act.id)!;

    await shares.respond(ANA, s.id, true);

    const reminderId = state.reminders.find((r) => r.activity_id === act.id)!.id;
    expect(state.recipients.some((r) => r.reminder_id === reminderId && r.user_id === ANA)).toBe(true);
  });
});

describe('quitar un share', () => {
  it('lo puede quitar quien creo la actividad', async () => {
    const { shares, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await shares.shareActivity(YO, act.id, [ANA]);
    const s = state.activityShares.find((x) => x.activity_id === act.id)!;

    await shares.removeShare(YO, s.id);

    expect(state.activityShares.find((x) => x.id === s.id)).toBeUndefined();
  });

  it('tambien lo puede quitar el invitado', async () => {
    const { shares, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await shares.shareActivity(YO, act.id, [ANA]);
    const s = state.activityShares.find((x) => x.activity_id === act.id)!;

    await shares.removeShare(ANA, s.id);

    expect(state.activityShares.find((x) => x.id === s.id)).toBeUndefined();
  });

  it('un tercero no puede', async () => {
    const { shares, actividades, state } = fresh();
    const act = await actividades.create(YO, nueva());
    await shares.shareActivity(YO, act.id, [ANA]);
    const s = state.activityShares.find((x) => x.activity_id === act.id)!;

    await expect(shares.removeShare(PEDRO, s.id)).rejects.toThrow(/no puedes/i);
  });

  it('ignora en silencio un share inexistente', async () => {
    const { shares } = fresh();
    await expect(shares.removeShare(YO, 'no-existe')).resolves.toBeUndefined();
  });
});
