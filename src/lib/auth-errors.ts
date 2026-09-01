/** Traduce errores de Supabase Auth / red a mensajes de UI en español (RF-A3). */
export const AUTH_MESSAGES = {
  invalidCredentials: 'Credenciales incorrectas. Revisa tu correo y contraseña.',
  offline: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
  emailTaken: 'Ese correo ya está registrado.',
  usernameTaken: 'Ese username ya está en uso.',
  emailNotConfirmed: 'Confirma tu correo antes de iniciar sesión.',
  tooManyRequests: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  generic: 'Algo salió mal. Inténtalo de nuevo.',
} as const;

export function isOfflineError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /network request failed|failed to fetch|load failed|fetch failed|networkerror/i.test(
    message,
  );
}

export function toAuthMessage(error: unknown): string {
  if (isOfflineError(error)) return AUTH_MESSAGES.offline;
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials|invalid_credentials/i.test(message)) {
    return AUTH_MESSAGES.invalidCredentials;
  }
  if (/already registered|already been registered|user_already_exists/i.test(message)) {
    return AUTH_MESSAGES.emailTaken;
  }
  if (/profiles_username_key|username.*already|duplicate key/i.test(message)) {
    return AUTH_MESSAGES.usernameTaken;
  }
  if (/email not confirmed|email_not_confirmed/i.test(message)) {
    return AUTH_MESSAGES.emailNotConfirmed;
  }
  if (/rate limit|too many requests|over_request_rate_limit/i.test(message)) {
    return AUTH_MESSAGES.tooManyRequests;
  }
  return AUTH_MESSAGES.generic;
}

/** Error listo para mostrar en UI. */
export class AuthUiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AuthUiError';
  }
}
