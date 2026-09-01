/**
 * Servicio de autenticación (spec 03). Único punto que habla con
 * supabase.auth; devuelve errores con mensajes en español listos para UI.
 */
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { AUTH_MESSAGES, AuthUiError, toAuthMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName?: string;
};

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', {
    p_username: username.toLowerCase(),
  });
  if (error) throw new AuthUiError(toAuthMessage(error), error);
  return data === true;
}

/** Registro con email + contraseña + username único (RF-A1, RF-A2). */
export async function signUp({ email, password, username, displayName }: SignUpInput) {
  const normalized = username.toLowerCase();
  const available = await isUsernameAvailable(normalized);
  if (!available) throw new AuthUiError(AUTH_MESSAGES.usernameTaken);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: normalized, display_name: displayName ?? null } },
  });
  if (error) throw new AuthUiError(toAuthMessage(error), error);
  return data;
}

/** Inicio de sesión (RF-A3). */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AuthUiError(toAuthMessage(error), error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthUiError(toAuthMessage(error), error);
}

/** Recuperación de contraseña por email, flujo estándar de Supabase (RF-A7). */
export async function resetPassword(email: string) {
  const redirectTo = Linking.createURL('/reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new AuthUiError(toAuthMessage(error), error);
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AuthUiError(toAuthMessage(error), error);
  return data.session;
}

/** Suscripción a cambios de sesión; devuelve la función para cancelarla. */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
