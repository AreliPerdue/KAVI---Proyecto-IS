/**
 * Disponibilidad compartida en el backend demo (RF-S8, P4).
 *
 * Esta es la superficie con la regla de privacidad mas estricta de KAVI: quien te
 * comparte su calendario en modo `busy` cede sus horas ocupadas, no lo que hace en
 * ellas. El equivalente en Supabase es la RPC `get_availability`, que decide lo mismo
 * dentro de la base; si el demo filtrara distinto, la app ensenaria titulos ajenos al
 * cambiar de backend. Por eso se prueba que el titulo y el color viajen en `null`.
 */
import type { AvailabilityApi } from '@/services/contracts';
import type { Activity } from '@/types/domain';

const YO = 'demo-user';
const ANA = 'demo-ana';     // comparte en modo `busy`
const PEDRO = 'demo-pedro'; // comparte en modo `details`
const LUIS = 'demo-luis';   // no comparte su calendario

const DESDE = '2026-09-07T00:00:00.000Z';
const HASTA = '2026-09-08T00:00:00.000Z';

type Store = typeof import('@/services/demo/store');

const actividad = (over: Partial<Activity>): Activity =>
  ({
    id: 'x', owner_id: YO, title: 'Bloque', description: null, theme_id: null,
    dimension: null, color: '#4CAF50', icon: null, all_day: false, is_gym: false,
    recurrence_rule: null, recurrence_parent_id: null,
    created_at: DESDE, updated_at: DESDE,
    start_at: '2026-09-07T15:00:00.000Z', end_at: '2026-09-07T16:00:00.000Z',
    ...over,
  }) as Activity;

/** Estado demo recien cargado, con las actividades sustituidas por las del caso. */
function fresh(actividades: Activity[]): { api: AvailabilityApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const mod = require('@/services/demo/availability') as typeof import('@/services/demo/availability');
  /* eslint-enable @typescript-eslint/no-require-imports */
  store.demoState.activities = actividades;
  return { api: mod.demoAvailability, state: store.demoState };
}

describe('que se ve de cada persona', () => {
  it('de quien comparte en modo detalles llega el titulo y el color', async () => {
    const { api } = fresh([actividad({ id: 'p1', owner_id: PEDRO, title: 'Dentista', color: '#E91E63' })]);

    const [bloque] = await api.getAvailability(YO, [PEDRO], DESDE, HASTA);

    expect(bloque.title).toBe('Dentista');
    expect(bloque.color).toBe('#E91E63');
  });

  it('de quien comparte solo ocupacion llega el hueco, nunca el titulo (P4)', async () => {
    const { api } = fresh([actividad({ id: 'a1', owner_id: ANA, title: 'Terapia', color: '#E91E63' })]);

    const [bloque] = await api.getAvailability(YO, [ANA], DESDE, HASTA);

    expect(bloque.start_at).toBe('2026-09-07T15:00:00.000Z');
    expect(bloque.end_at).toBe('2026-09-07T16:00:00.000Z');
    expect(bloque.title).toBeNull();
    expect(bloque.color).toBeNull();
  });

  it('de quien no comparte su calendario no llega nada', async () => {
    const { api } = fresh([actividad({ id: 'l1', owner_id: LUIS, title: 'Junta' })]);

    expect(await api.getAvailability(YO, [LUIS], DESDE, HASTA)).toEqual([]);
  });

  it('de uno mismo se ve todo aunque no haya share', async () => {
    const { api } = fresh([actividad({ id: 'm1', owner_id: YO, title: 'Mi junta', color: '#2196F3' })]);

    const [bloque] = await api.getAvailability(YO, [YO], DESDE, HASTA);

    expect(bloque.title).toBe('Mi junta');
    expect(bloque.color).toBe('#2196F3');
  });

  it('pedir varias personas a la vez respeta la visibilidad de cada una', async () => {
    const { api } = fresh([
      actividad({ id: 'p1', owner_id: PEDRO, title: 'Dentista' }),
      actividad({ id: 'a1', owner_id: ANA, title: 'Terapia' }),
      actividad({ id: 'l1', owner_id: LUIS, title: 'Junta' }),
    ]);

    const bloques = await api.getAvailability(YO, [PEDRO, ANA, LUIS], DESDE, HASTA);

    expect(bloques).toHaveLength(2);
    expect(bloques.find((b) => b.user_id === PEDRO)?.title).toBe('Dentista');
    expect(bloques.find((b) => b.user_id === ANA)?.title).toBeNull();
    expect(bloques.some((b) => b.user_id === LUIS)).toBe(false);
  });
});

describe('recorte por rango', () => {
  it('una actividad que solapa el borde inicial si cuenta', async () => {
    const { api } = fresh([
      actividad({ id: 'p1', owner_id: PEDRO, start_at: '2026-09-06T23:00:00.000Z', end_at: '2026-09-07T01:00:00.000Z' }),
    ]);

    expect(await api.getAvailability(YO, [PEDRO], DESDE, HASTA)).toHaveLength(1);
  });

  it('una que termina justo al empezar el rango no cuenta', async () => {
    const { api } = fresh([
      actividad({ id: 'p1', owner_id: PEDRO, start_at: '2026-09-06T22:00:00.000Z', end_at: DESDE }),
    ]);

    expect(await api.getAvailability(YO, [PEDRO], DESDE, HASTA)).toEqual([]);
  });

  it('una que empieza justo al acabar el rango tampoco', async () => {
    const { api } = fresh([
      actividad({ id: 'p1', owner_id: PEDRO, start_at: HASTA, end_at: '2026-09-08T01:00:00.000Z' }),
    ]);

    expect(await api.getAvailability(YO, [PEDRO], DESDE, HASTA)).toEqual([]);
  });

  it('las de fuera del rango se descartan', async () => {
    const { api } = fresh([
      actividad({ id: 'p1', owner_id: PEDRO, start_at: '2026-09-20T15:00:00.000Z', end_at: '2026-09-20T16:00:00.000Z' }),
    ]);

    expect(await api.getAvailability(YO, [PEDRO], DESDE, HASTA)).toEqual([]);
  });
});

describe('forma del resultado', () => {
  it('los bloques salen ordenados por hora de inicio', async () => {
    const { api } = fresh([
      actividad({ id: 'p2', owner_id: PEDRO, start_at: '2026-09-07T18:00:00.000Z', end_at: '2026-09-07T19:00:00.000Z' }),
      actividad({ id: 'p1', owner_id: PEDRO, start_at: '2026-09-07T09:00:00.000Z', end_at: '2026-09-07T10:00:00.000Z' }),
      actividad({ id: 'a1', owner_id: ANA, start_at: '2026-09-07T12:00:00.000Z', end_at: '2026-09-07T13:00:00.000Z' }),
    ]);

    const bloques = await api.getAvailability(YO, [PEDRO, ANA], DESDE, HASTA);

    expect(bloques.map((b) => b.start_at)).toEqual([
      '2026-09-07T09:00:00.000Z',
      '2026-09-07T12:00:00.000Z',
      '2026-09-07T18:00:00.000Z',
    ]);
  });

  it('sin personas que consultar devuelve vacio', async () => {
    const { api } = fresh([actividad({ id: 'p1', owner_id: PEDRO })]);
    expect(await api.getAvailability(YO, [], DESDE, HASTA)).toEqual([]);
  });

  it('cada bloque dice de quien es', async () => {
    const { api } = fresh([actividad({ id: 'p1', owner_id: PEDRO })]);
    const [bloque] = await api.getAvailability(YO, [PEDRO], DESDE, HASTA);
    expect(bloque.user_id).toBe(PEDRO);
  });
});
