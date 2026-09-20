import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';

/** Traduce un error de PostgREST al mensaje en español que ve la persona (NFR-13). */
export function toError(error: { message: string; code?: string }): AuthUiError {
  if (isOfflineError(error)) return new AuthUiError(AUTH_MESSAGES.offline, error);
  // 42501 = la RLS o un trigger rechazaron la operación.
  if (error.code === '42501') {
    return new AuthUiError('No tienes permiso para hacer eso.', error);
  }
  if (error.code === '23505') {
    return new AuthUiError('Eso ya existe.', error);
  }
  return new AuthUiError(AUTH_MESSAGES.generic, error);
}

/** Lanza si hubo error; si no, devuelve los datos ya tipados. */
export function unwrap<T>(result: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (result.error) throw toError(result.error);
  if (result.data === null) throw new AuthUiError(AUTH_MESSAGES.generic);
  return result.data;
}
