/**
 * Punto de entrada de la app (RF-A5, RF-C15).
 *
 * Decide la primera pantalla que se ve al abrir. Lo que importa fijar es que **solo**
 * la primerisima vez se vaya a Perfil: a partir de ahi la app abre en el calendario,
 * que es para lo que se usa. Y que ese "ya la vio" se marque una sola vez, porque si
 * no la app abriria en Perfil para siempre.
 */
import { render } from '@testing-library/react-native';

import { usePreferencesStore } from '@/store/preferences-store';

/** Prefijo `mock` obligatorio: Jest eleva las fabricas de `jest.mock` sobre los imports. */
const mockRedirect = jest.fn();
let mockUsuario: { id: string } | null = null;

jest.mock('expo-router', () => ({
  __esModule: true,
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));
jest.mock('@/providers', () => ({ useAuth: () => ({ user: mockUsuario }) }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/index').default as () => React.ReactElement;

beforeEach(() => {
  mockRedirect.mockReset();
  mockUsuario = { id: 'u1' };
  usePreferencesStore.setState({ visto: true, hydrated: true });
});

describe('sin sesion', () => {
  it('lleva al inicio de sesion', async () => {
    mockUsuario = null;
    await render(<Pantalla />);

    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/login');
  });

  /** Aunque sea la primera vez: sin cuenta no hay Perfil que configurar. */
  it('aunque sea la primera vez que se abre', async () => {
    mockUsuario = null;
    usePreferencesStore.setState({ visto: false, hydrated: true });
    await render(<Pantalla />);

    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/login');
  });
});

describe('con sesion', () => {
  it('abre en el calendario', async () => {
    await render(<Pantalla />);

    expect(mockRedirect).toHaveBeenCalledWith('/(app)/(tabs)/calendar');
  });

  /** Un calendario vacio no dice que hacer; Perfil tiene el Nobi y el cumpleanos. */
  it('la primera vez abre en Perfil', async () => {
    usePreferencesStore.setState({ visto: false, hydrated: true });
    await render(<Pantalla />);

    expect(mockRedirect).toHaveBeenCalledWith('/(app)/(tabs)/profile');
  });

  it('y deja constancia de que ya se abrio', async () => {
    usePreferencesStore.setState({ visto: false, hydrated: true });
    await render(<Pantalla />);

    expect(usePreferencesStore.getState().visto).toBe(true);
  });

  /**
   * Antes de leer las preferencias del disco, `visto` es `false` por omision. Tomar
   * eso por "primera vez" mandaria a Perfil en cada arranque, que es justo el bug
   * que `hydrated` evita.
   */
  it('mientras no se han leido las preferencias no se decide que es la primera vez', async () => {
    usePreferencesStore.setState({ visto: false, hydrated: false });
    await render(<Pantalla />);

    expect(mockRedirect).toHaveBeenCalledWith('/(app)/(tabs)/calendar');
    expect(usePreferencesStore.getState().visto).toBe(false);
  });
});
