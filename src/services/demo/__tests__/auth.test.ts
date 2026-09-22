/**
 * Autenticacion del backend demo (spec 03).
 *
 * El alta por pasos es lo mas delicado: verificar el codigo ya abre sesion pero
 * deja la cuenta sin contrasena, y solo `setPassword` la completa (RF-A8). Una
 * cuenta a medias no debe poder iniciar sesion.
 */
import { DEMO_OTP } from '@/constants/demo';
import { AUTH_MESSAGES } from '@/lib/auth-errors';
import type { AuthApi } from '@/services/contracts';

type Store = typeof import('@/services/demo/store');

function fresh(): { auth: AuthApi; state: Store['demoState'] } {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports -- recarga deliberada del estado demo */
  const store = require('@/services/demo/store') as Store;
  const mod = require('@/services/demo/auth') as typeof import('@/services/demo/auth');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return { auth: mod.demoAuth, state: store.demoState };
}

describe('isUsernameAvailable (RF-A1)', () => {
  it('reporta ocupado uno que ya existe', async () => {
    const { auth } = fresh();
    expect(await auth.isUsernameAvailable('demo')).toBe(false);
  });

  it('reporta libre uno que no existe', async () => {
    const { auth } = fresh();
    expect(await auth.isUsernameAvailable('nadie_lo_tiene')).toBe(true);
  });

  it('la comparacion ignora mayusculas', async () => {
    const { auth } = fresh();
    expect(await auth.isUsernameAvailable('DEMO')).toBe(false);
  });
});

describe('signUp directo', () => {
  const alta = { email: 'Nueva@Kavi.app', password: 'secreta123', username: 'Nueva', displayName: 'Nueva Persona' };

  it('crea la cuenta y abre sesion', async () => {
    const { auth, state } = fresh();

    const r = await auth.signUp(alta);

    expect(r.sessionCreated).toBe(true);
    expect(state.currentUser?.id).toBe(r.user?.id);
  });

  it('normaliza correo y username a minusculas', async () => {
    const { auth, state } = fresh();

    const r = await auth.signUp(alta);

    expect(r.user?.email).toBe('nueva@kavi.app');
    expect(state.accounts.find((a) => a.user.id === r.user?.id)?.profile.username).toBe('nueva');
  });

  it('rechaza un username ocupado', async () => {
    const { auth } = fresh();
    await expect(auth.signUp({ ...alta, username: 'demo' })).rejects.toThrow(AUTH_MESSAGES.usernameTaken);
  });

  it('rechaza un correo ya registrado', async () => {
    const { auth } = fresh();
    await expect(auth.signUp({ ...alta, email: 'demo@kavi.app' })).rejects.toThrow(AUTH_MESSAGES.emailTaken);
  });

  it('la cuenta nueva nace sin rol de administracion', async () => {
    const { auth, state } = fresh();
    const r = await auth.signUp(alta);
    expect(state.accounts.find((a) => a.user.id === r.user?.id)?.profile.role).toBe('user');
  });
});

describe('alta por pasos (RF-A8)', () => {
  const CORREO = 'paso@kavi.app';

  it('el primer paso no crea cuenta todavia', async () => {
    const { auth, state } = fresh();
    const antes = state.accounts.length;

    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');

    expect(state.accounts).toHaveLength(antes);
  });

  it('rechaza empezar con un correo ya registrado', async () => {
    const { auth } = fresh();
    await expect(auth.startEmailSignUp('demo@kavi.app', 'X', 'xx')).rejects.toThrow(AUTH_MESSAGES.emailTaken);
  });

  it('rechaza empezar con un username ocupado', async () => {
    const { auth } = fresh();
    await expect(auth.startEmailSignUp(CORREO, 'X', 'demo')).rejects.toThrow(AUTH_MESSAGES.usernameTaken);
  });

  it('el codigo correcto crea la cuenta y abre sesion', async () => {
    const { auth, state } = fresh();
    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');

    const user = await auth.verifyEmailOtp(CORREO, DEMO_OTP);

    expect(user.email).toBe(CORREO);
    expect(state.currentUser?.id).toBe(user.id);
  });

  it('conserva el username elegido en el paso previo', async () => {
    const { auth, state } = fresh();
    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');

    const user = await auth.verifyEmailOtp(CORREO, DEMO_OTP);

    expect(state.accounts.find((a) => a.user.id === user.id)?.profile.username).toBe('persona');
  });

  it('la cuenta queda sin contrasena hasta el ultimo paso', async () => {
    const { auth, state } = fresh();
    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');
    const user = await auth.verifyEmailOtp(CORREO, DEMO_OTP);

    expect(state.accounts.find((a) => a.user.id === user.id)?.password).toBe('');
  });

  it('una cuenta a medias no puede iniciar sesion', async () => {
    const { auth } = fresh();
    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');
    await auth.verifyEmailOtp(CORREO, DEMO_OTP);

    await expect(auth.signIn(CORREO, '')).rejects.toThrow(AUTH_MESSAGES.invalidCredentials);
  });

  it('un codigo incorrecto se distingue de uno caducado', async () => {
    const { auth } = fresh();
    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');

    await expect(auth.verifyEmailOtp(CORREO, '000000')).rejects.toThrow(AUTH_MESSAGES.invalidCode);
  });

  it('verificar sin haber empezado se reporta como caducado', async () => {
    const { auth } = fresh();
    await expect(auth.verifyEmailOtp('nadie@kavi.app', DEMO_OTP)).rejects.toThrow(AUTH_MESSAGES.expiredCode);
  });

  it('el codigo se consume: no sirve dos veces', async () => {
    const { auth } = fresh();
    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');
    await auth.verifyEmailOtp(CORREO, DEMO_OTP);

    await expect(auth.verifyEmailOtp(CORREO, DEMO_OTP)).rejects.toThrow(AUTH_MESSAGES.expiredCode);
  });

  it('setPassword completa el alta y ya permite entrar', async () => {
    const { auth } = fresh();
    await auth.startEmailSignUp(CORREO, 'Persona', 'persona');
    await auth.verifyEmailOtp(CORREO, DEMO_OTP);

    await auth.setPassword('secreta123');

    await expect(auth.signIn(CORREO, 'secreta123')).resolves.toMatchObject({ email: CORREO });
  });

  it('setPassword sin sesion falla', async () => {
    const { auth } = fresh();
    await expect(auth.setPassword('secreta123')).rejects.toThrow(AUTH_MESSAGES.generic);
  });
});

describe('signIn', () => {
  it('entra con las credenciales de la cuenta demo', async () => {
    const { auth, state } = fresh();

    const user = await auth.signIn('demo@kavi.app', 'demo1234');

    expect(user.email).toBe('demo@kavi.app');
    expect(state.currentUser?.id).toBe(user.id);
  });

  it('rechaza la contrasena incorrecta', async () => {
    const { auth } = fresh();
    await expect(auth.signIn('demo@kavi.app', 'mala')).rejects.toThrow(AUTH_MESSAGES.invalidCredentials);
  });

  it('el correo no distingue mayusculas', async () => {
    const { auth } = fresh();
    await expect(auth.signIn('DEMO@KAVI.APP', 'demo1234')).resolves.toBeTruthy();
  });

  it('un correo nuevo crea cuenta al vuelo (solo en demo)', async () => {
    const { auth, state } = fresh();
    const antes = state.accounts.length;

    await auth.signIn('otra@kavi.app', 'secreta123');

    expect(state.accounts).toHaveLength(antes + 1);
  });

  it('pero exige una contrasena de al menos 8 caracteres', async () => {
    const { auth } = fresh();
    await expect(auth.signIn('otra@kavi.app', 'corta')).rejects.toThrow(AUTH_MESSAGES.invalidCredentials);
  });

  it('el username derivado del correo cumple el formato', async () => {
    const { auth, state } = fresh();

    const user = await auth.signIn('a.b+c@kavi.app', 'secreta123');

    const username = state.accounts.find((a) => a.user.id === user.id)?.profile.username ?? '';
    expect(username).toMatch(/^[a-z0-9_]+$/);
    expect(username.length).toBeGreaterThanOrEqual(3);
  });
});

describe('changePassword (RF-A9)', () => {
  it('cambia la contrasena comprobando la actual', async () => {
    const { auth } = fresh();

    await auth.changePassword('demo@kavi.app', 'demo1234', 'nueva1234');

    await expect(auth.signIn('demo@kavi.app', 'nueva1234')).resolves.toBeTruthy();
  });

  it('rechaza si la actual no coincide', async () => {
    const { auth } = fresh();
    await expect(auth.changePassword('demo@kavi.app', 'mala', 'nueva1234')).rejects.toThrow(
      AUTH_MESSAGES.invalidCredentials,
    );
  });

  it('rechaza repetir la misma contrasena', async () => {
    const { auth } = fresh();
    await expect(auth.changePassword('demo@kavi.app', 'demo1234', 'demo1234')).rejects.toThrow(
      AUTH_MESSAGES.samePassword,
    );
  });

  it('falla con un correo desconocido', async () => {
    const { auth } = fresh();
    await expect(auth.changePassword('nadie@kavi.app', 'x', 'y')).rejects.toThrow(
      AUTH_MESSAGES.invalidCredentials,
    );
  });
});

describe('sesion', () => {
  it('getSession devuelve null sin sesion', async () => {
    const { auth } = fresh();
    expect(await auth.getSession()).toBeNull();
  });

  it('getSession devuelve la sesion abierta', async () => {
    const { auth } = fresh();
    const user = await auth.signIn('demo@kavi.app', 'demo1234');

    expect(await auth.getSession()).toMatchObject({ id: user.id });
  });

  it('signOut la cierra', async () => {
    const { auth } = fresh();
    await auth.signIn('demo@kavi.app', 'demo1234');

    await auth.signOut();

    expect(await auth.getSession()).toBeNull();
  });

  it('onAuthStateChange avisa al entrar y al salir', async () => {
    const { auth } = fresh();
    const avisos: unknown[] = [];
    auth.onAuthStateChange((u) => avisos.push(u));

    await auth.signIn('demo@kavi.app', 'demo1234');
    await auth.signOut();

    expect(avisos).toHaveLength(2);
    expect(avisos[1]).toBeNull();
  });

  it('cancelar la suscripcion deja de avisar', async () => {
    const { auth } = fresh();
    const avisos: unknown[] = [];
    const cancelar = auth.onAuthStateChange((u) => avisos.push(u));

    cancelar();
    await auth.signIn('demo@kavi.app', 'demo1234');

    expect(avisos).toHaveLength(0);
  });

  it('resetPassword no falla (en demo no envia nada)', async () => {
    const { auth } = fresh();
    await expect(auth.resetPassword('demo@kavi.app')).resolves.toBeUndefined();
  });
});
