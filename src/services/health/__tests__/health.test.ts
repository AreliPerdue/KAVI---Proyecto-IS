/**
 * Datos de salud por plataforma (spec 11): web no tiene, iOS espera a HealthKit (T262) y el demo
 * simula permisos parciales sin inventar ceros.
 */
jest.mock('@/services/health/demo', () => jest.requireActual('@/services/health/demo'));

describe('sin plataforma de salud', () => {
  it('web: estado "web" y nada que leer', async () => {
    const { platformHealth } = jest.requireActual('@/services/health/platform.web') as typeof import('@/services/health/platform.web');
    expect(await platformHealth.availability()).toEqual({ status: 'web', source: null, reason: 'web' });
    expect(await platformHealth.dailyTotals('2026-10-01', '2026-10-07')).toEqual([]);
  });

  it('iOS sin HealthKit todavía: "unsupported" con su motivo', async () => {
    const { platformHealth } = jest.requireActual('@/services/health/platform') as typeof import('@/services/health/platform');
    expect(await platformHealth.availability()).toEqual({ status: 'unsupported', source: null, reason: 'ios_soon' });
  });
});

describe('demo', () => {
  const cargar = () => {
    jest.resetModules();
    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- estado del demo fresco */
    return (require('@/services/health/demo') as typeof import('@/services/health/demo')).demoHealth;
  };

  beforeEach(() => jest.useFakeTimers({ advanceTimers: true }));
  afterEach(() => jest.useRealTimers());

  it('con permiso solo de pasos, las demás cifras quedan en "sin dato", nunca en 0', async () => {
    const health = cargar();
    await health.requestPermissions(['steps']);
    const [dia] = await health.dailyTotals('2026-10-01', '2026-10-01');
    expect(dia?.steps).toBeGreaterThan(0);
    expect(dia?.distanceM).toBeNull();
    expect(dia?.activeKcal).toBeNull();
  });

  it('sin permiso de entrenamientos no devuelve sesiones', async () => {
    const health = cargar();
    await health.requestPermissions(['steps']);
    expect(await health.exerciseSessions('2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z')).toEqual([]);
  });

  it('las sesiones de otras apps llegan como tipo (clave), no como texto en un idioma', async () => {
    const health = cargar();
    await health.requestPermissions(['exercise_sessions']);
    const sesiones = await health.exerciseSessions('2000-01-01T00:00:00Z', '2100-01-01T00:00:00Z');
    expect(sesiones.length).toBeGreaterThan(0);
    expect(sesiones.every((s) => s.title === null && /^[a-z_]+$/.test(s.kind))).toBe(true);
  });

  it('desconectar quita todos los permisos', async () => {
    const health = cargar();
    await health.requestPermissions(['steps', 'distance']);
    await health.disconnect();
    expect(Object.values(await health.permissions()).some(Boolean)).toBe(false);
  });
});
