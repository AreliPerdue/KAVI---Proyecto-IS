/**
 * Notificaciones locales (RF-C10, RF-S17).
 *
 * El modulo nativo se carga de forma perezosa y puede no estar: en web no existe,
 * en Expo Go fue retirado en el SDK 53, y un binario compilado sin el modulo lo deja
 * ausente. Los tres casos tienen que degradar en silencio —devolver `false` o `0`—
 * y nunca reventar: esta pantalla se monta en el arranque de la app.
 *
 * Lo otro que importa es que `syncNotifications` sea idempotente: cancela todo antes
 * de reconstruir, porque si no cada refresco acumularia un duplicado por recordatorio.
 */
import type { UpcomingReminder } from '@/types/domain';

type Modulo = typeof import('@/lib/notifications');

/** Prefijo `mock` obligatorio: Jest eleva las fabricas de `jest.mock` sobre los imports. */
let mockOS = 'ios';
let mockEntorno = 'bare';

jest.mock('react-native', () => ({ Platform: { get OS() { return mockOS; } } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { get executionEnvironment() { return mockEntorno; } },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const mockNativo = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
};
jest.mock('expo-notifications', () => mockNativo);

/**
 * Modulo recien cargado: `load()` memoriza el resultado y el manejador se instala una
 * sola vez, asi que ese estado se pega entre pruebas si no se recarga.
 */
function fresh(): Modulo {
  jest.resetModules();
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- recarga deliberada */
  return require('@/lib/notifications') as Modulo;
}

const recordatorio = (min: number, id = 'r1'): UpcomingReminder => ({
  reminderId: id,
  activityId: 'a1',
  title: 'Terapia',
  body: 'En 30 minutos',
  fireAt: new Date(Date.now() + min * 60_000).toISOString(),
  activityStartAt: new Date(Date.now() + (min + 30) * 60_000).toISOString(),
});

beforeEach(() => {
  mockOS = 'ios';
  mockEntorno = 'bare';
  for (const fn of Object.values(mockNativo)) if (typeof fn === 'function') (fn as jest.Mock).mockReset();
  mockNativo.getPermissionsAsync.mockResolvedValue({ granted: true });
  mockNativo.requestPermissionsAsync.mockResolvedValue({ granted: true });
  mockNativo.cancelAllScheduledNotificationsAsync.mockResolvedValue(undefined);
  mockNativo.scheduleNotificationAsync.mockResolvedValue('id');
});

describe('cuando el modulo nativo no esta', () => {
  /** Cada entorno llega por un camino distinto, pero el resultado debe ser el mismo. */
  const entornos: [string, () => void][] = [
    ['en web', () => { mockOS = 'web'; }],
    ['en Expo Go', () => { mockEntorno = 'storeClient'; }],
  ];

  for (const [nombre, preparar] of entornos) {
    describe(nombre, () => {
      beforeEach(preparar);

      it('se declara no disponible', () => {
        expect(fresh().notificationsAvailable()).toBe(false);
      });

      it('el permiso no aplica, que no es lo mismo que denegado', async () => {
        await expect(fresh().notificationPermissionGranted()).resolves.toBeNull();
      });

      it('no se puede conceder permiso', async () => {
        await expect(fresh().ensureNotificationPermission()).resolves.toBe(false);
      });

      it('programar no hace nada y no revienta', async () => {
        await expect(fresh().syncNotifications([recordatorio(30)])).resolves.toBe(0);
        expect(mockNativo.scheduleNotificationAsync).not.toHaveBeenCalled();
      });

      it('avisar tampoco', async () => {
        await expect(fresh().presentNow('Hola', 'Que tal')).resolves.toBe(false);
      });
    });
  }

  /** Binario nativo compilado sin el modulo: el `require` lanza y hay que tragarlo. */
  describe('en un binario sin el modulo compilado', () => {
    function sinModulo(): Modulo {
      jest.resetModules();
      jest.doMock('expo-notifications', () => { throw new Error('modulo nativo ausente'); });
      /* eslint-disable-next-line @typescript-eslint/no-require-imports -- recarga deliberada */
      const m = require('@/lib/notifications') as Modulo;
      return m;
    }

    // `dontMock` dejaria pasar el modulo real al resto del archivo; se repone el doble.
    afterEach(() => { jest.doMock('expo-notifications', () => mockNativo); });

    it('se declara no disponible en vez de romper el arranque', () => {
      expect(sinModulo().notificationsAvailable()).toBe(false);
    });

    it('programar devuelve cero', async () => {
      await expect(sinModulo().syncNotifications([recordatorio(30)])).resolves.toBe(0);
    });
  });
});

describe('permisos', () => {
  it('si ya esta concedido no se vuelve a pedir', async () => {
    mockNativo.getPermissionsAsync.mockResolvedValue({ granted: true });

    await expect(fresh().ensureNotificationPermission()).resolves.toBe(true);

    expect(mockNativo.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('si no lo esta, se pide', async () => {
    mockNativo.getPermissionsAsync.mockResolvedValue({ granted: false });
    mockNativo.requestPermissionsAsync.mockResolvedValue({ granted: true });

    await expect(fresh().ensureNotificationPermission()).resolves.toBe(true);

    expect(mockNativo.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('y si se deniega, se respeta', async () => {
    mockNativo.getPermissionsAsync.mockResolvedValue({ granted: false });
    mockNativo.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(fresh().ensureNotificationPermission()).resolves.toBe(false);
  });

  /** Para pintar el estado en Perfil sin provocar el dialogo del sistema. */
  it('consultar el estado no lo pide', async () => {
    mockNativo.getPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(fresh().notificationPermissionGranted()).resolves.toBe(false);

    expect(mockNativo.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('programar recordatorios', () => {
  it('programa uno por recordatorio futuro', async () => {
    const n = await fresh().syncNotifications([recordatorio(30, 'r1'), recordatorio(90, 'r2')]);

    expect(n).toBe(2);
    expect(mockNativo.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  /**
   * Idempotencia: sin este borrado, cada refresco del calendario dejaria otra copia
   * de cada recordatorio y la persona recibiria el mismo aviso varias veces.
   */
  it('cancela todo lo anterior antes de reconstruir', async () => {
    await fresh().syncNotifications([recordatorio(30)]);

    expect(mockNativo.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    const ordenCancelar = mockNativo.cancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0];
    const ordenProgramar = mockNativo.scheduleNotificationAsync.mock.invocationCallOrder[0];
    expect(ordenCancelar).toBeLessThan(ordenProgramar);
  });

  /** Un recordatorio vencido ya no avisa de nada: programarlo dispararia al instante. */
  it('se salta los que ya pasaron', async () => {
    const n = await fresh().syncNotifications([recordatorio(-10, 'viejo'), recordatorio(30, 'nuevo')]);

    expect(n).toBe(1);
    expect(mockNativo.scheduleNotificationAsync.mock.calls[0][0].identifier).toBe('nuevo');
  });

  it('lleva el identificador del recordatorio, para poder reemplazarlo', async () => {
    await fresh().syncNotifications([recordatorio(30, 'r-42')]);

    const arg = mockNativo.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.identifier).toBe('r-42');
    expect(arg.content.title).toBe('Terapia');
    expect(arg.content.data).toEqual({ activityId: 'a1' });
    expect(arg.trigger.type).toBe('date');
  });

  it('sin permiso no programa nada', async () => {
    mockNativo.getPermissionsAsync.mockResolvedValue({ granted: false });
    mockNativo.requestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(fresh().syncNotifications([recordatorio(30)])).resolves.toBe(0);

    expect(mockNativo.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('sin recordatorios solo cancela', async () => {
    await expect(fresh().syncNotifications([])).resolves.toBe(0);

    expect(mockNativo.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  /** El manejador es global: instalarlo en cada sincronizacion seria trabajo repetido. */
  it('instala el manejador una sola vez', async () => {
    const modulo = fresh();
    await modulo.syncNotifications([recordatorio(30)]);
    await modulo.syncNotifications([recordatorio(30)]);

    expect(mockNativo.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});

describe('aviso inmediato (RF-S17)', () => {
  it('se muestra sin programarlo para mas tarde', async () => {
    await expect(fresh().presentNow('Nueva solicitud', 'Ana quiere ser tu contacto')).resolves.toBe(true);

    const arg = mockNativo.scheduleNotificationAsync.mock.calls[0][0];
    expect(arg.content.title).toBe('Nueva solicitud');
    expect(arg.trigger).toBeNull();
  });

  it('acepta datos para abrir lo que corresponda', async () => {
    await fresh().presentNow('Invitacion', 'Gimnasio juntos', { activityId: 'a9' });

    expect(mockNativo.scheduleNotificationAsync.mock.calls[0][0].content.data).toEqual({ activityId: 'a9' });
  });

  /**
   * Aqui no se pide permiso a proposito: seria el dialogo del sistema por sorpresa,
   * sin que la persona haya hecho nada. Se pide al configurar el primer recordatorio.
   */
  it('sin permiso no avisa y tampoco lo pide', async () => {
    mockNativo.getPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(fresh().presentNow('Hola', 'Que tal')).resolves.toBe(false);

    expect(mockNativo.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNativo.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
