import type { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { AUTH_MESSAGES, AuthUiError, toAuthMessage } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { AuthApi } from '@/services/contracts';
import type { AuthUser } from '@/types/domain';

function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null;
  return { id: user.id, email: user.email ?? '' };
}

export const supabaseAuth: AuthApi = {
  async isUsernameAvailable(username) {
    const { data, error } = await getSupabase().rpc('is_username_available', {
      p_username: username.toLowerCase(),
    });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
    return data === true;
  },

  /** Registro con email + contraseña + username único (RF-A1, RF-A2). */
  async signUp({ email, password, username, displayName }) {
    const normalized = username.toLowerCase();
    const available = await supabaseAuth.isUsernameAvailable(normalized);
    if (!available) throw new AuthUiError(AUTH_MESSAGES.usernameTaken);

    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { username: normalized, display_name: displayName ?? null } },
    });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
    return { user: toAuthUser(data.user), sessionCreated: !!data.session };
  },

  /**
   * Alta por pasos, paso 1 (RF-A8): OTP de 6 dígitos al correo. Supabase crea el usuario
   * al verificar, así que el username y el nombre viajan como metadata para el trigger
   * `handle_new_user`. Si el correo ya tiene cuenta se corta aquí: es el identificador único.
   */
  async startEmailSignUp(email, displayName, username) {
    const normalized = email.trim().toLowerCase();
    const desired = username.trim().toLowerCase();
    // Otra persona pudo tomarlo entre que se eligió y se envía el código.
    if (!(await supabaseAuth.isUsernameAvailable(desired))) {
      throw new AuthUiError(AUTH_MESSAGES.usernameTaken);
    }
    const { error } = await getSupabase().auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: true,
        data: { username: desired, display_name: displayName.trim() || null },
      },
    });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
  },

  /** Paso 2: verificar el código deja sesión abierta, todavía sin contraseña (RF-A8). */
  async verifyEmailOtp(email, code) {
    const { data, error } = await getSupabase().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
    const user = toAuthUser(data.user);
    if (!user) throw new AuthUiError(AUTH_MESSAGES.generic);
    return user;
  },

  /** Paso 3: fija la contraseña de la sesión ya verificada (RF-A8). */
  async setPassword(newPassword) {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
  },

  /**
   * Cambio de contraseña (RF-A9). `updateUser` no comprueba la actual, así que primero
   * se reautentica: sin eso, cualquiera con el móvil desbloqueado podría cambiarla.
   */
  async changePassword(email, currentPassword, newPassword) {
    const { error: signInError } = await getSupabase().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: currentPassword,
    });
    if (signInError) throw new AuthUiError(AUTH_MESSAGES.invalidCredentials, signInError);
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
  },

  /** Inicio de sesión (RF-A3). */
  async signIn(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
    const user = toAuthUser(data.user);
    if (!user) throw new AuthUiError(AUTH_MESSAGES.generic);
    return user;
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw new AuthUiError(toAuthMessage(error), error);
  },

  /** Recuperación de contraseña por email, flujo estándar de Supabase (RF-A7). */
  async resetPassword(email) {
    const redirectTo = Linking.createURL('/reset-password');
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new AuthUiError(toAuthMessage(error), error);
  },

  async getSession() {
    const { data, error } = await getSupabase().auth.getSession();
    if (error) throw new AuthUiError(toAuthMessage(error), error);
    return toAuthUser(data.session?.user);
  },

  onAuthStateChange(callback) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      callback(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },
};
