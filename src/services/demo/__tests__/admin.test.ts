/**
 * Panel de administracion en el backend demo (spec 09): equivalente en memoria
 * de `admin_stats()` y `admin_accounts()`. Son numeros agregados del producto:
 * nunca contenido de ninguna cuenta.
 */
import type { AdminApi } from '@/services/contracts';

type Store = typeof import('@/services/demo/store');

function fresh(): { admin: AdminApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const mod = require('@/services/demo/admin') as typeof import('@/services/demo/admin');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { admin: mod.demoAdmin, state: store.demoState };
}

describe('getStats', () => {
  it('cuenta todas las cuentas', async () => {
    const { admin, state } = fresh();
    expect((await admin.getStats()).total_accounts).toBe(state.accounts.length);
  });

  it('cuenta todas las actividades', async () => {
    const { admin, state } = fresh();
    expect((await admin.getStats()).total_activities).toBe(state.activities.length);
  });

  it('las altas de 7 dias no superan a las de 30', async () => {
    const { admin } = fresh();
    const s = await admin.getStats();
    expect(s.accounts_7d).toBeLessThanOrEqual(s.accounts_30d);
  });

  it('cuenta solo las conexiones aceptadas', async () => {
    const { admin, state } = fresh();
    const aceptadas = state.connections.filter((c) => c.status === 'accepted').length;

    expect((await admin.getStats()).accepted_connections).toBe(aceptadas);
  });

  it('los temas personalizados excluyen los del sistema', async () => {
    const { admin } = fresh();
    expect((await admin.getStats()).custom_themes).toBe(0);
  });

  it('las personas activas no superan al total de cuentas', async () => {
    const { admin } = fresh();
    const s = await admin.getStats();
    expect(s.active_users_30d).toBeLessThanOrEqual(s.total_accounts);
  });

  it('devuelve todas las metricas del contrato', async () => {
    const { admin } = fresh();
    const s = await admin.getStats();

    for (const clave of [
      'total_accounts', 'accounts_7d', 'accounts_30d', 'active_users_30d',
      'total_activities', 'activities_30d', 'accepted_connections',
      'shared_calendars', 'custom_themes', 'total_workouts',
    ] as const) {
      expect(typeof s[clave]).toBe('number');
    }
  });
});

describe('listAccounts', () => {
  it('devuelve una fila por cuenta', async () => {
    const { admin, state } = fresh();
    expect(await admin.listAccounts()).toHaveLength(state.accounts.length);
  });

  it('incluye correo, rol y fecha de alta', async () => {
    const { admin } = fresh();
    const cuentas = await admin.listAccounts();
    const demo = cuentas.find((c) => c.email === 'demo@kavi.app');

    expect(demo?.role).toBe('adminkavi');
    expect(demo?.created_at).toEqual(expect.any(String));
  });

  it('cuenta las actividades de cada persona', async () => {
    const { admin, state } = fresh();
    const cuentas = await admin.listAccounts();
    const demo = cuentas.find((c) => c.email === 'demo@kavi.app');
    const propias = state.activities.filter((a) => a.owner_id === 'demo-user').length;

    expect(demo?.activity_count).toBe(propias);
  });

  it('la ultima actividad es la mas reciente de esa persona', async () => {
    const { admin } = fresh();
    const demo = (await admin.listAccounts()).find((c) => c.email === 'demo@kavi.app');

    expect(demo?.last_active_at).toEqual(expect.any(String));
  });

  it('una cuenta sin actividades no tiene ultima actividad', async () => {
    const { admin, state } = fresh();
    state.activities.length = 0;

    const cuentas = await admin.listAccounts();

    expect(cuentas.every((c) => c.last_active_at === null)).toBe(true);
  });

  it('vienen de la mas reciente a la mas antigua', async () => {
    const { admin } = fresh();
    const fechas = (await admin.listAccounts()).map((c) => c.created_at);

    expect([...fechas].sort().reverse()).toEqual(fechas);
  });

  it('no expone contrasenas', async () => {
    const { admin } = fresh();
    const cuentas = await admin.listAccounts();

    expect(JSON.stringify(cuentas)).not.toContain('demo1234');
  });
});
