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
