import { AUTH_MESSAGES, AuthUiError, isOfflineError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { ActivitiesApi } from '@/services/contracts';
import type { Activity } from '@/types/domain';

function toError(error: { message: string }): AuthUiError {
  if (isOfflineError(error)) return new AuthUiError(AUTH_MESSAGES.offline, error);
  return new AuthUiError(AUTH_MESSAGES.generic, error);
}

/** Lectura por rango visible (NFR-1): start_at < to AND end_at > from; la RLS filtra. */
export const supabaseActivities: ActivitiesApi = {
  async listByRange(_userId, fromIso, toIso) {
    const { data, error } = await getSupabase()
      .from('activities')
      .select('*')
      .lt('start_at', toIso)
      .gt('end_at', fromIso)
      .order('start_at');
    if (error) throw toError(error);
    return data as Activity[];
  },

  async getById(id) {
    const { data, error } = await getSupabase().from('activities').select('*').eq('id', id).single();
    if (error) throw toError(error);
    return data as Activity;
  },

  async create(userId, input) {
    const { data, error } = await getSupabase()
      .from('activities')
      .insert({ ...input, owner_id: userId })
      .select('*')
      .single();
    if (error) throw toError(error);
    return data as Activity;
  },

  async update(id, patch) {
    const { data, error } = await getSupabase()
      .from('activities')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw toError(error);
    return data as Activity;
  },

  async remove(id) {
    const { error } = await getSupabase().from('activities').delete().eq('id', id);
    if (error) throw toError(error);
  },
};
