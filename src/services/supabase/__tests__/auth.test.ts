/**
 * Autenticacion contra Supabase (spec 03).
 *
 * Lo mas importante que fija este archivo es `changePassword`: `updateUser` de
 * Supabase NO comprueba la contrasena actual, asi que el servicio reautentica
 * primero. Sin ese paso, cualquiera con el telefono desbloqueado podria
 * cambiarla (RF-A9).
 */
import { AUTH_MESSAGES } from '@/lib/auth-errors';

const mockAuth = {
  signUp: jest.fn(),
  signInWithOtp: jest.fn(),
  verifyOtp: jest.fn(),
  updateUser: jest.fn(),
  signInWithPassword: jest.fn(),
  signOut: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
};
const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ auth: mockAuth, rpc: (...a: unknown[]) => mockRpc(...a) }),
}));
jest.mock('expo-linking', () => ({ createURL: (ruta: string) => `kavi://${ruta}` }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { supabaseAuth } = require('@/services/supabase/auth') as typeof import('@/services/supabase/auth');

const USUARIO = { id: 'u1', email: 'areli@kavi.app' };
const ok = (data: unknown) => ({ data, error: null });
/**
 * Los errores de autenticacion de supabase-js son instancias de `AuthError`,
 * que extiende `Error`. Importa para las pruebas: la traduccion lee `.message`
 * solo cuando el valor es un `Error`; con un objeto plano caeria al mensaje
 * generico. (Los errores de PostgREST si son objetos planos, y ese caso esta
 * cubierto aparte en errors.test.ts.)
 */
const falla = (message: string) => ({ data: {}, error: new Error(message) });

beforeEach(() => {
  for (const fn of Object.values(mockAuth)) fn.mockReset();
  mockRpc.mockReset();
  mockRpc.mockResolvedValue(ok(true));
});

describe('isUsernameAvailable (RF-A1)', () => {
  it('consulta la RPC en minusculas', async () => {
    await supabaseAuth.isUsernameAvailable('Areli');
    expect(mockRpc).toHaveBeenCalledWith('is_username_available', { p_username: 'areli' });
  });

  it('solo true significa disponible', async () => {
    mockRpc.mockResolvedValue(ok(true));
    expect(await supabaseAuth.isUsernameAvailable('libre')).toBe(true);

    mockRpc.mockResolvedValue(ok(false));
    expect(await supabaseAuth.isUsernameAvailable('ocupado')).toBe(false);
  });

  it('una respuesta nula se trata como no disponible', async () => {
    mockRpc.mockResolvedValue(ok(null));
    expect(await supabaseAuth.isUsernameAvailable('x')).toBe(false);
  });

  it('traduce el error al espanol', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('boom') });
    await expect(supabaseAuth.isUsernameAvailable('x')).rejects.toThrow(AUTH_MESSAGES.generic);
  });
});

describe('signUp (RF-A2)', () => {
  const alta = { email: 'areli@kavi.app', password: 'secreta123', username: 'Areli', displayName: 'Areli' };

  it('comprueba el username antes de crear la cuenta', async () => {
    mockRpc.mockResolvedValue(ok(false));

    await expect(supabaseAuth.signUp(alta)).rejects.toThrow(AUTH_MESSAGES.usernameTaken);
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('manda username y nombre como metadatos para el trigger', async () => {
    mockAuth.signUp.mockResolvedValue(ok({ user: USUARIO, session: {} }));

    await supabaseAuth.signUp(alta);

    expect(mockAuth.signUp.mock.calls[0][0].options.data).toEqual({ username: 'areli', display_name: 'Areli' });
  });

  it('informa si Supabase no abrio sesion (correo por confirmar)', async () => {
    mockAuth.signUp.mockResolvedValue(ok({ user: USUARIO, session: null }));

    expect((await supabaseAuth.signUp(alta)).sessionCreated).toBe(false);
  });

  it('traduce un correo ya registrado', async () => {
    mockAuth.signUp.mockResolvedValue(falla('User already registered'));
    await expect(supabaseAuth.signUp(alta)).rejects.toThrow(AUTH_MESSAGES.emailTaken);
  });
});

describe('alta por pasos (RF-A8)', () => {
  it('revalida el username justo antes de enviar el codigo', async () => {
    mockRpc.mockResolvedValue(ok(false));

    await expect(supabaseAuth.startEmailSignUp('a@kavi.app', 'Areli', 'areli')).rejects.toThrow(
      AUTH_MESSAGES.usernameTaken,
    );
    expect(mockAuth.signInWithOtp).not.toHaveBeenCalled();
  });

  it('normaliza correo y username, y permite crear la cuenta', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ error: null });

    await supabaseAuth.startEmailSignUp('  Areli@Kavi.app ', '  Areli  ', ' Areli ');

    const arg = mockAuth.signInWithOtp.mock.calls[0][0];
    expect(arg.email).toBe('areli@kavi.app');
    expect(arg.options.shouldCreateUser).toBe(true);
    expect(arg.options.data).toEqual({ username: 'areli', display_name: 'Areli' });
  });

  it('un nombre vacio viaja como null, no como cadena vacia', async () => {
    mockAuth.signInWithOtp.mockResolvedValue({ error: null });

    await supabaseAuth.startEmailSignUp('a@kavi.app', '   ', 'areli');

    expect(mockAuth.signInWithOtp.mock.calls[0][0].options.data.display_name).toBeNull();
  });

  it('verificar el codigo devuelve la persona', async () => {
    mockAuth.verifyOtp.mockResolvedValue(ok({ user: USUARIO }));

    expect(await supabaseAuth.verifyEmailOtp(' Areli@Kavi.app ', ' 123456 ')).toEqual(USUARIO);
    expect(mockAuth.verifyOtp.mock.calls[0][0]).toMatchObject({ email: 'areli@kavi.app', token: '123456', type: 'email' });
  });

  it('un codigo caducado se distingue de uno invalido', async () => {
    mockAuth.verifyOtp.mockResolvedValue(falla('Token has expired'));
    await expect(supabaseAuth.verifyEmailOtp('a@kavi.app', '1')).rejects.toThrow(AUTH_MESSAGES.expiredCode);

    mockAuth.verifyOtp.mockResolvedValue(falla('invalid_otp'));
    await expect(supabaseAuth.verifyEmailOtp('a@kavi.app', '1')).rejects.toThrow(AUTH_MESSAGES.invalidCode);
  });

  it('sin usuario en la respuesta tambien falla', async () => {
    mockAuth.verifyOtp.mockResolvedValue(ok({ user: null }));
    await expect(supabaseAuth.verifyEmailOtp('a@kavi.app', '1')).rejects.toThrow(AUTH_MESSAGES.generic);
  });

  it('setPassword actualiza la sesion ya verificada', async () => {
    mockAuth.updateUser.mockResolvedValue({ error: null });

    await supabaseAuth.setPassword('secreta123');

    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'secreta123' });
  });
});

describe('changePassword (RF-A9)', () => {
  it('reautentica antes de cambiar: updateUser no comprueba la actual', async () => {
    mockAuth.signInWithPassword.mockResolvedValue(ok({ user: USUARIO }));
    mockAuth.updateUser.mockResolvedValue({ error: null });

    await supabaseAuth.changePassword('areli@kavi.app', 'vieja123', 'nueva123');

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'areli@kavi.app', password: 'vieja123' });
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'nueva123' });
  });

  it('si la actual no coincide, no toca la contrasena', async () => {
    mockAuth.signInWithPassword.mockResolvedValue(falla('Invalid login credentials'));

    await expect(supabaseAuth.changePassword('a@kavi.app', 'mala', 'nueva123')).rejects.toThrow(
      AUTH_MESSAGES.invalidCredentials,
    );
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });

  it('traduce el rechazo de repetir la misma contrasena', async () => {
    mockAuth.signInWithPassword.mockResolvedValue(ok({ user: USUARIO }));
    mockAuth.updateUser.mockResolvedValue({ error: new Error('New password should be different from the old password') });

    await expect(supabaseAuth.changePassword('a@kavi.app', 'x', 'x')).rejects.toThrow(AUTH_MESSAGES.samePassword);
  });
});

describe('signIn / signOut (RF-A3)', () => {
  it('devuelve la persona al entrar', async () => {
    mockAuth.signInWithPassword.mockResolvedValue(ok({ user: USUARIO }));
    expect(await supabaseAuth.signIn('areli@kavi.app', 'secreta123')).toEqual(USUARIO);
  });

  it('traduce credenciales incorrectas', async () => {
    mockAuth.signInWithPassword.mockResolvedValue(falla('Invalid login credentials'));
    await expect(supabaseAuth.signIn('a@kavi.app', 'x')).rejects.toThrow(AUTH_MESSAGES.invalidCredentials);
  });

  it('un fallo de red no se confunde con credenciales incorrectas', async () => {
    mockAuth.signInWithPassword.mockResolvedValue(falla('Network request failed'));
    await expect(supabaseAuth.signIn('a@kavi.app', 'x')).rejects.toThrow(AUTH_MESSAGES.offline);
  });

  it('signOut propaga su error', async () => {
    mockAuth.signOut.mockResolvedValue({ error: new Error('boom') });
    await expect(supabaseAuth.signOut()).rejects.toThrow(AUTH_MESSAGES.generic);
  });

  it('signOut sin error resuelve', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await expect(supabaseAuth.signOut()).resolves.toBeUndefined();
  });
});

describe('resetPassword (RF-A7)', () => {
  it('manda una URL de retorno hacia la app', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

    await supabaseAuth.resetPassword('areli@kavi.app');

    const [correo, opciones] = mockAuth.resetPasswordForEmail.mock.calls[0];
    expect(correo).toBe('areli@kavi.app');
    expect(String(opciones.redirectTo)).toContain('reset-password');
  });

  it('propaga el error traducido', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: new Error('Too many requests') });
    await expect(supabaseAuth.resetPassword('a@kavi.app')).rejects.toThrow(AUTH_MESSAGES.tooManyRequests);
  });
});

describe('sesion', () => {
  it('getSession devuelve la persona si hay sesion', async () => {
    mockAuth.getSession.mockResolvedValue(ok({ session: { user: USUARIO } }));
    expect(await supabaseAuth.getSession()).toEqual(USUARIO);
  });

  it('getSession devuelve null sin sesion', async () => {
    mockAuth.getSession.mockResolvedValue(ok({ session: null }));
    expect(await supabaseAuth.getSession()).toBeNull();
  });

  it('un usuario sin correo no rompe: se normaliza a cadena vacia', async () => {
    mockAuth.getSession.mockResolvedValue(ok({ session: { user: { id: 'u1' } } }));
    expect(await supabaseAuth.getSession()).toEqual({ id: 'u1', email: '' });
  });

  it('onAuthStateChange traduce la sesion a la persona', async () => {
    const desuscribir = jest.fn();
    mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: desuscribir } } });
    const avisos: unknown[] = [];

    const cancelar = supabaseAuth.onAuthStateChange((u) => avisos.push(u));
    const interno = mockAuth.onAuthStateChange.mock.calls[0][0];
    interno('SIGNED_IN', { user: USUARIO });
    interno('SIGNED_OUT', null);

    expect(avisos).toEqual([USUARIO, null]);

    cancelar();
    expect(desuscribir).toHaveBeenCalledTimes(1);
  });
});
