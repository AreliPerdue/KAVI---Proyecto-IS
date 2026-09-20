import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { ProfilesApi } from '@/services/contracts';
import type { Profile } from '@/types/domain';

const PROFILE_COLUMNS = 'id, username, display_name, avatar_url, created_at, role';

function toProfileError(error: { message: string; code?: string }): AuthUiError {
  if (isOfflineError(error)) return new AuthUiError(AUTH_MESSAGES.offline, error);
  // 23505 = índice único de username; 23514 = no cumple el formato.
  if (error.code === '23505') return new AuthUiError(AUTH_MESSAGES.usernameTaken, error);
  if (error.code === '23514') {
    return new AuthUiError('Ese usuario no es válido: solo letras minúsculas, números y guion bajo.', error);
  }
  return new AuthUiError(AUTH_MESSAGES.generic, error);
}

export const supabaseProfiles: ProfilesApi = {
  async getMyProfile(userId) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();
    if (error) throw toProfileError(error);
    return data as Profile;
  },

  /** El trigger `normalize_username` pasa a minúsculas y recorta antes de validar. */
  async updateMyProfile(userId, patch) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw toProfileError(error);
    return data as Profile;
  },
};
