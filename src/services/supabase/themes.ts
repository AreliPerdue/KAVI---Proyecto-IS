import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { ThemesApi } from '@/services/contracts';
import type { Theme } from '@/types/domain';

export const supabaseThemes: ThemesApi = {
  async list() {
    const { data, error } = await getSupabase().from('themes').select('*').order('name');
    if (error) {
      throw new AuthUiError(isOfflineError(error) ? AUTH_MESSAGES.offline : AUTH_MESSAGES.generic, error);
    }
    return data as Theme[];
  },
};
