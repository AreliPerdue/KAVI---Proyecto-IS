/**
 * Estado de sesion de toda la app (RF-A4, RF-A5, RF-A8).
 *
 * Dos comportamientos criticos: si restaurar la sesion falla —por ejemplo sin
 * red— la app tiene que arrancar en login en vez de quedarse cargando para
 * siempre; y `signUpPending` debe mantener a la persona fuera de la app entre
 * verificar el codigo y fijar la contrasena, porque el OTP ya abre sesion.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/auth-provider';

const mockGetSession = jest.fn();
const mockUnsubscribe = jest.fn();
type Avisar = (u: { id: string; email: string } | null) => void;
const mockOnAuthStateChange = jest.fn((_cb: Avisar) => mockUnsubscribe);

jest.mock('@/services/auth', () => ({
  getSession: () => mockGetSession(),
  onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb as never),
}));

const USUARIO = { id: 'u1', email: 'areli@kavi.app' };

function Sonda() {
  const { user, userId, isLoading, signUpPending, setSignUpPending } = useAuth();
  return (
    <>
      <Text>{isLoading ? 'cargando' : 'listo'}</Text>
      <Text>{userId ?? 'sin sesion'}</Text>
      <Text>{user?.email ?? 'sin correo'}</Text>
      <Text>{signUpPending ? 'alta pendiente' : 'alta completa'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="pendiente" onPress={() => setSignUpPending(true)}>
        <Text>pendiente</Text>
      </Pressable>
    </>
  );
}

const montar = () =>
  render(
    <AuthProvider>
      <Sonda />
    </AuthProvider>,
  );

beforeEach(() => {
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockClear();
  mockUnsubscribe.mockClear();
});

describe('restauracion de sesion', () => {
  it('con sesion guardada la deja disponible', async () => {
    mockGetSession.mockResolvedValue(USUARIO);
    await montar();

    await waitFor(() => expect(screen.getByText('u1')).toBeTruthy());
    expect(screen.getByText('areli@kavi.app')).toBeTruthy();
  });

  it('sin sesion arranca sin usuario', async () => {
    mockGetSession.mockResolvedValue(null);
    await montar();

    await waitFor(() => expect(screen.getByText('listo')).toBeTruthy());
    expect(screen.getByText('sin sesion')).toBeTruthy();
  });

  it('termina de cargar aunque restaurar falle (sin red)', async () => {
    mockGetSession.mockRejectedValue(new Error('Network request failed'));
    await montar();

    await waitFor(() => expect(screen.getByText('listo')).toBeTruthy());
    expect(screen.getByText('sin sesion')).toBeTruthy();
  });

  it('se suscribe a los cambios de sesion del backend', async () => {
    mockGetSession.mockResolvedValue(null);
    await montar();

    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1));
  });

  it('un cambio en el backend se refleja en la app', async () => {
    mockGetSession.mockResolvedValue(null);
    await montar();
    await waitFor(() => expect(screen.getByText('listo')).toBeTruthy());

    const avisar = mockOnAuthStateChange.mock.calls[0]?.[0] as Avisar;
    await act(async () => {
      avisar(USUARIO);
    });

    expect(screen.getByText('u1')).toBeTruthy();
  });

  it('cancela la suscripcion al desmontar', async () => {
    mockGetSession.mockResolvedValue(null);
    await montar();
    await waitFor(() => expect(screen.getByText('listo')).toBeTruthy());

    // En RNTL 14 desmontar tambien es asincrono.
    await screen.unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('alta por pasos (RF-A8)', () => {
  it('arranca sin alta pendiente', async () => {
    mockGetSession.mockResolvedValue(null);
    await montar();

    await waitFor(() => expect(screen.getByText('alta completa')).toBeTruthy());
  });

  it('se puede marcar como pendiente para retener a la persona en el ultimo paso', async () => {
    mockGetSession.mockResolvedValue(null);
    await montar();
    await waitFor(() => expect(screen.getByText('listo')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('pendiente'));

    expect(screen.getByText('alta pendiente')).toBeTruthy();
  });
});

describe('useAuth', () => {
  it('falla con un mensaje util fuera del provider', async () => {
    const silencio = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Sonda />)).rejects.toThrow(/dentro de <AuthProvider>/);
    silencio.mockRestore();
  });
});
