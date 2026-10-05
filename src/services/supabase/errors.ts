import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import { t } from '@/i18n';
import { getSupabase } from '@/lib/supabase';

/**
 * Traduce un error de PostgREST al mensaje en español que ve la persona (NFR-13).
 *
 * Además lo deja crudo en la consola. El mensaje traducido está para que la persona sepa
 * qué pasó, no para depurar: "no tienes permiso" cubre una política mal puesta, una sesión
 * caducada y una columna que no existe, y sin el original no hay cómo distinguirlas. Pasó
 * exactamente eso con el alta de listas.
 */
export function toError(error: { message: string; code?: string; details?: string; hint?: string }): AuthUiError {
   
  console.error('[supabase]', error.code ?? 'sin código', error.message, error.details ?? '', error.hint ?? '');
  if (isOfflineError(error)) return new AuthUiError(AUTH_MESSAGES.offline, error);
  /*
   * 42501 lo devuelve la RLS, y hay dos motivos muy distintos detrás:
   *
   *  - La operación de verdad no te corresponde (editar la lista de alguien más).
   *  - **La sesión caducó.** Sin token, el servidor te ve como anónima, ninguna política
   *    `to authenticated` aplica, y Postgres contesta exactamente lo mismo.
   *
   * El segundo caso parecía el primero y costó media tarde: la app seguía mostrando los
   * datos en caché, así que por fuera estabas dentro, pero toda escritura nueva se
   * rechazaba. Aquí se comprueba cuál de los dos es y, si no hay sesión, se cierra para
   * que el guard lleve a iniciar sesión en vez de dejar un mensaje que no se puede obedecer.
   */
  if (error.code === '42501') {
    void cerrarSiNoHaySesion();
    return new AuthUiError(t().errors.noPermission, error);
  }
  // 22023 lo usan las funciones de la base que ya traen el mensaje en español para la persona
  // (consentimiento, RF-A13): se muestra tal cual.
  if (error.code === '22023') {
    return new AuthUiError(error.message, error);
  }
  if (error.code === '23505') {
    return new AuthUiError(t().errors.alreadyExists, error);
  }
  return new AuthUiError(AUTH_MESSAGES.generic, error);
}

/** Lanza si hubo error; si no, devuelve los datos ya tipados. */
export function unwrap<T>(result: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (result.error) throw toError(result.error);
  if (result.data === null) throw new AuthUiError(AUTH_MESSAGES.generic);
  return result.data;
}

/** Comprueba la sesión tras un rechazo de RLS y la cierra si ya no existe. */
async function cerrarSiNoHaySesion(): Promise<void> {
  try {
    const { data } = await getSupabase().auth.getSession();
    if (!data.session) await getSupabase().auth.signOut();
  } catch {
    // Si ni siquiera se puede preguntar, no hay nada mejor que hacer aquí.
  }
}
