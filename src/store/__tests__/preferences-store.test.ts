/**
 * Preferencias de presentacion.
 *
 * Lo que de verdad hay que comprobar es el efecto lateral: guardar el valor no
 * basta, hay que propagarlo a `lib/dates`, que es de donde leen las funciones que
 * formatean horas en toda la app. Si se guardara sin propagar, el ajuste se veria
 * elegido en Perfil pero el calendario seguiria en 24 h.
 */
type Store = typeof import('@/store/preferences-store');
type Dates = typeof import('@/lib/dates');

/** Prefijo `mock` obligatorio: Jest eleva la fabrica de `jest.mock` sobre los imports. */
const mockAlmacen = new Map<string, string>();
/** Si esta puesto, la lectura del disco se queda esperando a que la prueba la suelte. */
let mockSoltarLectura: (() => void) | null = null;
let mockLecturaLenta = false;
jest.mock('@/lib/storage', () => ({
  getJson: async (k: string) => {
    // El disco devuelve lo que habia AL EMPEZAR la lectura; tardar en contestar no
    // cambia lo leido. Asi se comporta AsyncStorage en un telefono.
    const v = mockAlmacen.get(k);
    if (mockLecturaLenta) await new Promise<void>((r) => { mockSoltarLectura = r; });
    return v ? JSON.parse(v) : null;
  },
  setJson: async (k: string, v: unknown) => {
    mockAlmacen.set(k, JSON.stringify(v));
  },
}));

/**
 * Store recien cargado: el estado de zustand vive en el modulo y se pega entre
 * pruebas. Se devuelve tambien `lib/dates`, porque `resetModules` lo recarga a el
 * tambien: comprobar la propagacion contra el modulo importado arriba miraria una
 * copia distinta de la que acaba de usar el store.
 */
function fresh(): { store: Store; dates: Dates } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada */
  const dates = require('@/lib/dates') as Dates;
  const store = require('@/store/preferences-store') as Store;
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { store, dates };
}

beforeEach(() => {
  mockAlmacen.clear();
  mockLecturaLenta = false;
  mockSoltarLectura = null;
});

describe('valor inicial', () => {
  it('arranca en 24 h, que es lo habitual en es-MX', () => {
    const { store: { usePreferencesStore, DEFAULT_TIME_FORMAT } } = fresh();
    expect(DEFAULT_TIME_FORMAT).toBe('24h');
    expect(usePreferencesStore.getState().timeFormat).toBe('24h');
  });

  it('nace sin hidratar', () => {
    const { store: { usePreferencesStore } } = fresh();
    expect(usePreferencesStore.getState().hydrated).toBe(false);
  });
});

describe('cambiar el formato', () => {
  it('guarda el valor elegido', () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setTimeFormat('12h');
    expect(usePreferencesStore.getState().timeFormat).toBe('12h');
  });

  /** Sin esto el ajuste se veria elegido pero el calendario no cambiaria. */
  it('lo propaga a las funciones que formatean horas', () => {
    const { store: { usePreferencesStore }, dates } = fresh();

    usePreferencesStore.getState().setTimeFormat('12h');

    expect(dates.getTimeFormat()).toBe('12h');
  });

  it('se puede volver a 24 h', () => {
    const { store: { usePreferencesStore }, dates } = fresh();
    usePreferencesStore.getState().setTimeFormat('12h');
    usePreferencesStore.getState().setTimeFormat('24h');
    expect(dates.getTimeFormat()).toBe('24h');
  });

  it('lo persiste para la proxima sesion', async () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setTimeFormat('12h');

    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    expect(otra.store.usePreferencesStore.getState().timeFormat).toBe('12h');
  });
});

describe('hidratacion', () => {
  it('sin nada guardado se queda en el valor por omision', async () => {
    const { store: { usePreferencesStore } } = fresh();

    await usePreferencesStore.getState().hydrate();

    expect(usePreferencesStore.getState().timeFormat).toBe('24h');
    expect(usePreferencesStore.getState().hydrated).toBe(true);
  });

  it('al hidratar tambien propaga el formato guardado', async () => {
    const primera = fresh();
    primera.store.usePreferencesStore.getState().setTimeFormat('12h');

    // Recargar los modulos simula un arranque limpio: el reloj vuelve a 24 h y
    // solo la hidratacion puede devolverlo a lo que se habia guardado.
    const segunda = fresh();
    expect(segunda.dates.getTimeFormat()).toBe('24h');

    await segunda.store.usePreferencesStore.getState().hydrate();

    expect(segunda.dates.getTimeFormat()).toBe('12h');
  });

  it('no vuelve a hidratar si ya lo hizo', async () => {
    const { store: { usePreferencesStore } } = fresh();
    await usePreferencesStore.getState().hydrate();
    usePreferencesStore.getState().setTimeFormat('12h');

    await usePreferencesStore.getState().hydrate();

    expect(usePreferencesStore.getState().timeFormat).toBe('12h');
  });
});

describe('nombre del ultimo entrenamiento (RF-F7)', () => {
  it('arranca sin ninguno', () => {
    const { store: { usePreferencesStore } } = fresh();
    expect(usePreferencesStore.getState().lastWorkoutTitle).toBeNull();
  });

  it('guarda el que se le pase', () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setLastWorkoutTitle('Pierna');
    expect(usePreferencesStore.getState().lastWorkoutTitle).toBe('Pierna');
  });

  it('recorta los espacios', () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setLastWorkoutTitle('  Empuje A  ');
    expect(usePreferencesStore.getState().lastWorkoutTitle).toBe('Empuje A');
  });

  it('un nombre en blanco lo deja sin nombre, no en cadena vacia', () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setLastWorkoutTitle('   ');
    expect(usePreferencesStore.getState().lastWorkoutTitle).toBeNull();
  });

  it('se recuerda para la proxima sesion', async () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setLastWorkoutTitle('Pierna');

    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    expect(otra.store.usePreferencesStore.getState().lastWorkoutTitle).toBe('Pierna');
  });

  /** Se persisten juntos: guardar uno no puede borrar el otro. */
  it('cambiar el nombre no pierde el formato de hora', async () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setTimeFormat('12h');
    usePreferencesStore.getState().setLastWorkoutTitle('Pierna');

    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    expect(otra.store.usePreferencesStore.getState().timeFormat).toBe('12h');
    expect(otra.store.usePreferencesStore.getState().lastWorkoutTitle).toBe('Pierna');
  });

  it('y cambiar el formato no pierde el nombre', async () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setLastWorkoutTitle('Pierna');
    usePreferencesStore.getState().setTimeFormat('12h');

    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    expect(otra.store.usePreferencesStore.getState().lastWorkoutTitle).toBe('Pierna');
    expect(otra.store.usePreferencesStore.getState().timeFormat).toBe('12h');
  });
});

/**
 * Apariencia (NFR-18). Es una preferencia del dispositivo, no de la cuenta: quien
 * usa KAVI en el telefono de noche y en la web de dia elige distinto en cada uno.
 */
describe('apariencia (NFR-18)', () => {
  it('arranca en oscuro, que es como nacio KAVI', () => {
    const { store: { usePreferencesStore, DEFAULT_APPEARANCE } } = fresh();
    expect(DEFAULT_APPEARANCE).toBe('dark');
    expect(usePreferencesStore.getState().appearance).toBe('dark');
  });

  it('guarda la que se elija', () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setAppearance('light');
    expect(usePreferencesStore.getState().appearance).toBe('light');
  });

  it('se recuerda para la proxima sesion', async () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setAppearance('system');

    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    expect(otra.store.usePreferencesStore.getState().appearance).toBe('system');
  });

  /** Quien ya tenia preferencias guardadas nunca eligio apariencia: sigue en oscuro. */
  it('sin nada guardado se queda en oscuro', async () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setTimeFormat('12h');

    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    expect(otra.store.usePreferencesStore.getState().appearance).toBe('dark');
  });

  it('elegirla no pierde las demas preferencias', async () => {
    const { store: { usePreferencesStore } } = fresh();
    usePreferencesStore.getState().setTimeFormat('12h');
    usePreferencesStore.getState().setShowWorkouts(false);
    usePreferencesStore.getState().setAppearance('light');

    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    const estado = otra.store.usePreferencesStore.getState();
    expect(estado.appearance).toBe('light');
    expect(estado.timeFormat).toBe('12h');
    expect(estado.showWorkouts).toBe(false);
  });
});


/**
 * Leer las preferencias del disco es asincrono y en un telefono tarda lo suficiente
 * para que de tiempo a tocar un ajuste antes de que la lectura vuelva. Si `hydrate`
 * aplicara entonces lo guardado encima, el cambio recien hecho se deshace solo y se
 * ve como que el ajuste "no funciona". En web no se notaba: `localStorage` contesta
 * en el mismo tick.
 */
describe('elegir algo mientras se leen las preferencias', () => {
  it('no pierde la apariencia recien elegida', async () => {
    mockAlmacen.set('kavi.preferences', JSON.stringify({ timeFormat: '24h', appearance: 'dark' }));
    mockLecturaLenta = true;
    const { store: { usePreferencesStore } } = fresh();

    const hidratando = usePreferencesStore.getState().hydrate();
    usePreferencesStore.getState().setAppearance('light');
    mockSoltarLectura?.();
    await hidratando;

    expect(usePreferencesStore.getState().appearance).toBe('light');
  });

  it('ni el formato de hora', async () => {
    mockAlmacen.set('kavi.preferences', JSON.stringify({ timeFormat: '24h' }));
    mockLecturaLenta = true;
    const { store: { usePreferencesStore }, dates } = fresh();

    const hidratando = usePreferencesStore.getState().hydrate();
    usePreferencesStore.getState().setTimeFormat('12h');
    mockSoltarLectura?.();
    await hidratando;

    expect(usePreferencesStore.getState().timeFormat).toBe('12h');
    // Y el formato propagado tiene que ser el elegido, no el que venia del disco.
    expect(dates.formatTime(new Date(2026, 0, 1, 14, 30))).toMatch(/2:30/);
  });

  /** Lo que no se toco si viene del disco: no es un "no hidratar", es "no pisar". */
  it('lo que nadie toco si se aplica', async () => {
    mockAlmacen.set('kavi.preferences', JSON.stringify({ timeFormat: '12h', showWorkouts: false }));
    mockLecturaLenta = true;
    const { store: { usePreferencesStore } } = fresh();

    const hidratando = usePreferencesStore.getState().hydrate();
    usePreferencesStore.getState().setAppearance('light');
    mockSoltarLectura?.();
    await hidratando;

    expect(usePreferencesStore.getState().showWorkouts).toBe(false);
    expect(usePreferencesStore.getState().timeFormat).toBe('12h');
  });

  /** Y lo elegido antes de hidratar tiene que quedar guardado para la proxima sesion. */
  it('lo elegido antes de hidratar sobrevive a reabrir la app', async () => {
    mockAlmacen.set('kavi.preferences', JSON.stringify({ timeFormat: '12h', appearance: 'dark' }));
    mockLecturaLenta = true;
    const { store: { usePreferencesStore } } = fresh();

    const hidratando = usePreferencesStore.getState().hydrate();
    usePreferencesStore.getState().setAppearance('light');
    mockSoltarLectura?.();
    await hidratando;

    mockLecturaLenta = false;
    const otra = fresh();
    await otra.store.usePreferencesStore.getState().hydrate();

    expect(otra.store.usePreferencesStore.getState().appearance).toBe('light');
    expect(otra.store.usePreferencesStore.getState().timeFormat).toBe('12h');
  });
});
