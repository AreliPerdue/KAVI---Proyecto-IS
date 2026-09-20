import { AuthUiError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { AdminApi } from '@/services/contracts';
import { toError } from '@/services/supabase/errors';
import type { AdminAccount, AdminStats } from '@/types/domain';

/**
 * Spec 09 · Las dos funciones comprueban el rol dentro de la base (RF-AD6). Aquí no se
 * vuelve a comprobar a propósito: si el control viviera en el cliente, bastaría con
 * llamar a la API por fuera de la app para saltárselo.
 */
export const supabaseAdmin: AdminApi = {
  async getStats() {
    const { data, error } = await getSupabase().rpc('admin_stats');
    if (error) throw toError(error);
    const row = (data as AdminStats[] | null)?.[0];
    if (!row) throw new AuthUiError('No se pudieron leer las estadísticas.');
    return row;
  },

  async listAccounts() {
    const { data, error } = await getSupabase().rpc('admin_accounts', { p_limit: 200, p_offset: 0 });
    if (error) throw toError(error);
    return (data ?? []) as AdminAccount[];
  },
};
