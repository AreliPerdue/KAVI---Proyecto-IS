import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { ProfilesApi } from '@/services/contracts';
import type { Profile } from '@/types/domain';

const PROFILE_COLUMNS = 'id, username, display_name, avatar_url, created_at';

function toProfileError(error: { message: string; code?: string }): AuthUiError {
  if (isOfflineError(error)) return new AuthUiError(AUTH_MESSAGES.offline, error);
  if (error.code === '23505') return new AuthUiError(AUTH_MESSAGES.usernameTaken, error);
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

  async updateMyProfile(userId, patch) {
    const { data, error } = await getSupabase()
      .from('profiles')
      .update({ display_name: patch.display_name })
      .eq('id', userId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw toProfileError(error);
    return data as Profile;
  },
};
