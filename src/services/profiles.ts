/** Perfil propio (RF-A6). Tipos manuales hasta generar types/database.ts en T029. */
import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type ProfileUpdate = Pick<Profile, 'username' | 'display_name'>;

function toProfileError(error: { message: string; code?: string }): AuthUiError {
  if (isOfflineError(error)) return new AuthUiError(AUTH_MESSAGES.offline, error);
  if (error.code === '23505') return new AuthUiError(AUTH_MESSAGES.usernameTaken, error);
  return new AuthUiError(AUTH_MESSAGES.generic, error);
}

export async function getMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at')
    .eq('id', userId)
    .single();
  if (error) throw toProfileError(error);
  return data as Profile;
}

export async function updateMyProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ username: patch.username.toLowerCase(), display_name: patch.display_name })
    .eq('id', userId)
    .select('id, username, display_name, avatar_url, created_at')
    .single();
  if (error) throw toProfileError(error);
  return data as Profile;
}
