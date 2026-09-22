/**
 * Traduccion de errores de Supabase Auth a mensajes de UI (RF-A3).
 *
 * Supabase responde en ingles y con codigos internos; estas pruebas fijan que el
 * usuario vea siempre espanol y, sobre todo, que un fallo de red no se confunda
 * con credenciales incorrectas: son acciones distintas para quien lo lee.
 */
import { AUTH_MESSAGES, AuthUiError, isOfflineError, toAuthMessage } from '@/lib/auth-errors';

describe('isOfflineError', () => {
  it.each([
    'Network request failed',
    'TypeError: Failed to fetch',
    'Load failed',
    'fetch failed',
    'NetworkError when attempting to fetch resource',
  ])('reconoce %p como falta de conexion', (mensaje) => {
    expect(isOfflineError(new Error(mensaje))).toBe(true);
  });

  it('no confunde otros errores con falta de conexion', () => {
    expect(isOfflineError(new Error('Invalid login credentials'))).toBe(false);
  });

  it('acepta valores que no son Error', () => {
    expect(isOfflineError('network request failed')).toBe(true);
    expect(isOfflineError(null)).toBe(false);
    expect(isOfflineError(undefined)).toBe(false);
  });
});

describe('toAuthMessage', () => {
  it('la falta de conexion gana sobre cualquier otra coincidencia', () => {
    expect(toAuthMessage(new Error('Network request failed'))).toBe(AUTH_MESSAGES.offline);
  });

  it.each([
    ['Invalid login credentials', AUTH_MESSAGES.invalidCredentials],
    ['invalid_credentials', AUTH_MESSAGES.invalidCredentials],
    ['User already registered', AUTH_MESSAGES.emailTaken],
    ['user_already_exists', AUTH_MESSAGES.emailTaken],
    ['duplicate key value violates profiles_username_key', AUTH_MESSAGES.usernameTaken],
    ['Email not confirmed', AUTH_MESSAGES.emailNotConfirmed],
    ['email_not_confirmed', AUTH_MESSAGES.emailNotConfirmed],
    ['over_request_rate_limit', AUTH_MESSAGES.tooManyRequests],
    ['Too many requests', AUTH_MESSAGES.tooManyRequests],
    ['Token has expired', AUTH_MESSAGES.expiredCode],
    ['otp_expired', AUTH_MESSAGES.expiredCode],
    ['Invalid token', AUTH_MESSAGES.invalidCode],
    ['invalid_otp', AUTH_MESSAGES.invalidCode],
    ['New password should be different from the old password', AUTH_MESSAGES.samePassword],
  ])('traduce %p', (crudo, esperado) => {
    expect(toAuthMessage(new Error(crudo))).toBe(esperado);
  });

  it('ignora mayusculas y minusculas', () => {
    expect(toAuthMessage(new Error('INVALID LOGIN CREDENTIALS'))).toBe(AUTH_MESSAGES.invalidCredentials);
  });

  it('un codigo caducado no se reporta como codigo invalido', () => {
    expect(toAuthMessage(new Error('Token has expired'))).toBe(AUTH_MESSAGES.expiredCode);
    expect(toAuthMessage(new Error('Token has expired'))).not.toBe(AUTH_MESSAGES.invalidCode);
  });

  it('cae al mensaje generico con algo desconocido', () => {
    expect(toAuthMessage(new Error('boom 500'))).toBe(AUTH_MESSAGES.generic);
    expect(toAuthMessage({ raro: true })).toBe(AUTH_MESSAGES.generic);
  });

  it('nunca devuelve una cadena vacia', () => {
    for (const entrada of [new Error(''), null, undefined, 0, 'x']) {
      expect(toAuthMessage(entrada).length).toBeGreaterThan(0);
    }
  });

  it('todos los mensajes estan en espanol y son accionables', () => {
    for (const mensaje of Object.values(AUTH_MESSAGES)) {
      expect(mensaje.length).toBeGreaterThan(10);
      expect(mensaje).toMatch(/[.:]$/);
    }
  });
});

describe('AuthUiError', () => {
  it('conserva el mensaje y se identifica por nombre', () => {
    const e = new AuthUiError('Ese tema ya no existe.');
    expect(e.message).toBe('Ese tema ya no existe.');
    expect(e.name).toBe('AuthUiError');
    expect(e).toBeInstanceOf(Error);
  });

  it('guarda la causa original para depurar', () => {
    const origen = new Error('PGRST116');
    expect(new AuthUiError('Algo salió mal.', origen).cause).toBe(origen);
  });
});
