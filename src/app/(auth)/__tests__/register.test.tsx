/**
 * Alta por pasos (RF-A8): nombre → correo → usuario → código → contraseña.
 *
 * Dos comportamientos que no se ven mirando la pantalla y aqui quedan fijados:
 * el username se propone al salir del correo —no antes, porque se deriva de él—,
 * y verificar el codigo ya abre sesion, asi que el alta se marca como pendiente
 * para que el guard no entre a la app antes de tener contrasena.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Pantalla from '@/app/(auth)/register';

const mockStart = { mutate: jest.fn(), reset: jest.fn(), isPending: false, error: null as Error | null };
const mockVerify = { mutate: jest.fn(), reset: jest.fn(), isPending: false, error: null as Error | null };
const mockFinish = { mutate: jest.fn(), reset: jest.fn(), isPending: false, error: null as Error | null };
const mockSignOut = { mutate: jest.fn() };
const mockSetSignUpPending = jest.fn();
const mockDisponible = jest.fn();

jest.mock('@/hooks/use-auth-actions', () => ({
  useEmailSignUp: () => ({ start: mockStart, verify: mockVerify, finish: mockFinish }),
  useSignOut: () => mockSignOut,
}));
jest.mock('@/providers', () => ({ useAuth: () => ({ setSignUpPending: mockSetSignUpPending }) }));
jest.mock('@/services/auth', () => ({ isUsernameAvailable: (...a: unknown[]) => mockDisponible(...a) }));

const campo = (label: string) => screen.getByLabelText(label, { includeHiddenElements: true });
const continuar = () => fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));

/** Avanza del paso 0 al 2 dejando nombre y correo puestos. */
async function hastaUsuario() {
  await fireEvent.changeText(campo('Nombre'), 'Areli');
  await continuar();
  await waitFor(() => expect(screen.getByText('Tu correo')).toBeTruthy());
  await fireEvent.changeText(campo('Correo'), 'areli@kavi.app');
  await continuar();
  await waitFor(() => expect(screen.getByText('Elige tu usuario')).toBeTruthy());
}

beforeEach(() => {
  for (const m of [mockStart, mockVerify, mockFinish]) {
    m.mutate.mockReset(); m.reset.mockReset(); m.isPending = false; m.error = null;
  }
  mockSignOut.mutate.mockReset();
  mockSetSignUpPending.mockReset();
  mockDisponible.mockReset().mockResolvedValue(true);
});

describe('recorrido de pasos', () => {
  it('empieza preguntando el nombre', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('¿Cómo te llamas?')).toBeTruthy();
    expect(campo('Nombre')).toBeTruthy();
  });

  it('anuncia en que paso va', async () => {
    await render(<Pantalla />);
    expect(screen.getByLabelText('Paso 1 de 5')).toBeTruthy();
  });

  it('no avanza con el nombre vacio', async () => {
    await render(<Pantalla />);

    await continuar();

    await waitFor(() => expect(screen.getByText('¿Cómo te llamas?')).toBeTruthy());
  });

  it('avanza al correo con un nombre valido', async () => {
    await render(<Pantalla />);

    await fireEvent.changeText(campo('Nombre'), 'Areli');
    await continuar();

    await waitFor(() => expect(screen.getByText('Tu correo')).toBeTruthy());
  });

  it('no avanza con un correo invalido', async () => {
    await render(<Pantalla />);
    await fireEvent.changeText(campo('Nombre'), 'Areli');
    await continuar();
    await waitFor(() => expect(screen.getByText('Tu correo')).toBeTruthy());

    await fireEvent.changeText(campo('Correo'), 'no-es-correo');
    await continuar();

    await waitFor(() => expect(screen.getByText('Tu correo')).toBeTruthy());
  });

  it('se puede retroceder', async () => {
    await render(<Pantalla />);
    await fireEvent.changeText(campo('Nombre'), 'Areli');
    await continuar();
    await waitFor(() => expect(screen.getByText('Tu correo')).toBeTruthy());

    await fireEvent.press(screen.getByLabelText('Paso anterior'));

    await waitFor(() => expect(screen.getByText('¿Cómo te llamas?')).toBeTruthy());
  });
});

describe('propuesta de usuario (RF-A8)', () => {
  it('se deriva del correo al salir de ese paso', async () => {
    await render(<Pantalla />);

    await hastaUsuario();

    await waitFor(() => expect(mockDisponible).toHaveBeenCalled());
    expect(campo('Usuario').props.value).toBe('areli');
  });

  it('se puede cambiar por otro', async () => {
    await render(<Pantalla />);
    await hastaUsuario();

    await fireEvent.changeText(campo('Usuario'), 'otra_cosa');

    expect(campo('Usuario').props.value).toBe('otra_cosa');
  });

  it('si el derivado esta ocupado propone otro libre', async () => {
    mockDisponible.mockImplementation(async (u: string) => u !== 'areli');
    await render(<Pantalla />);

    await hastaUsuario();

    await waitFor(() => expect(campo('Usuario').props.value).not.toBe('areli'));
    expect(campo('Usuario').props.value).toMatch(/^[a-z0-9_]+$/);
  });
});

describe('envio del codigo', () => {
  it('se dispara al salir del paso de usuario, con los tres datos', async () => {
    await render(<Pantalla />);
    await hastaUsuario();

    await continuar();

    await waitFor(() => expect(mockStart.mutate).toHaveBeenCalled());
    expect(mockStart.mutate.mock.calls[0][0]).toMatchObject({
      email: 'areli@kavi.app', displayName: 'Areli', username: 'areli',
    });
  });

  it('el paso del codigo ofrece reenviarlo', async () => {
    mockStart.mutate.mockImplementation((_v: unknown, opts: { onSuccess?: () => void }) => opts?.onSuccess?.());
    await render(<Pantalla />);
    await hastaUsuario();

    await continuar();

    await waitFor(() => expect(screen.getByText('Confirma tu correo')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Enviar otro código' })).toBeTruthy();
  });
});

describe('verificacion y contrasena', () => {
  async function hastaCodigo() {
    mockStart.mutate.mockImplementation((_v: unknown, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await hastaUsuario();
    await continuar();
    await waitFor(() => expect(screen.getByText('Confirma tu correo')).toBeTruthy());
  }

  it('verificar marca el alta como pendiente para no entrar a la app sin contrasena', async () => {
    await render(<Pantalla />);
    await hastaCodigo();

    await fireEvent.changeText(campo('Código'), '123456');
    await continuar();

    await waitFor(() => expect(mockSetSignUpPending).toHaveBeenCalledWith(true));
    expect(mockVerify.mutate.mock.calls[0][0]).toMatchObject({ email: 'areli@kavi.app', code: '123456' });
  });

  it('si la verificacion falla se deshace la marca', async () => {
    mockVerify.mutate.mockImplementation((_v: unknown, o: { onError?: () => void }) => o?.onError?.());
    await render(<Pantalla />);
    await hastaCodigo();

    await fireEvent.changeText(campo('Código'), '000000');
    await continuar();

    await waitFor(() => expect(mockSetSignUpPending).toHaveBeenCalledWith(false));
  });

  it('el ultimo paso pide la contrasena y cambia el boton', async () => {
    mockVerify.mutate.mockImplementation((_v: unknown, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);
    await hastaCodigo();

    await fireEvent.changeText(campo('Código'), '123456');
    await continuar();

    await waitFor(() => expect(screen.getByText('Crea tu contraseña')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeTruthy();
  });

  it('exige que las dos contrasenas coincidan', async () => {
    mockVerify.mutate.mockImplementation((_v: unknown, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);
    await hastaCodigo();
    await fireEvent.changeText(campo('Código'), '123456');
    await continuar();
    await waitFor(() => expect(screen.getByText('Crea tu contraseña')).toBeTruthy());

    await fireEvent.changeText(campo('Contraseña'), 'secreta123');
    await fireEvent.changeText(campo('Confirmar contraseña'), 'otra12345');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(mockFinish.mutate).not.toHaveBeenCalled());
  });

  it('con ambas iguales completa el alta', async () => {
    mockVerify.mutate.mockImplementation((_v: unknown, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);
    await hastaCodigo();
    await fireEvent.changeText(campo('Código'), '123456');
    await continuar();
    await waitFor(() => expect(screen.getByText('Crea tu contraseña')).toBeTruthy());

    await fireEvent.changeText(campo('Contraseña'), 'secreta123');
    await fireEvent.changeText(campo('Confirmar contraseña'), 'secreta123');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(mockFinish.mutate).toHaveBeenCalledWith('secreta123', expect.anything()));
  });
});

describe('errores y estados', () => {
  it('muestra el error de cualquiera de los tres pasos', async () => {
    mockStart.error = new Error('Ese correo ya está registrado.');
    await render(<Pantalla />);

    expect(screen.getByText('Ese correo ya está registrado.')).toBeTruthy();
  });

  it('mientras hay peticion el boton queda ocupado', async () => {
    mockVerify.isPending = true;
    await render(<Pantalla />);

    const botones = screen.getAllByRole('button');
    expect(botones.some((b) => b.props.accessibilityState?.busy)).toBe(true);
  });

  it('abandonar el alta limpia la marca de pendiente', async () => {
    await render(<Pantalla />);

    await screen.unmount();

    expect(mockSetSignUpPending).toHaveBeenCalledWith(false);
  });
});
