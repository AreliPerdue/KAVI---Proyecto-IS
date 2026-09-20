import { getSupabase } from '@/lib/supabase';
import type { ThemesApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type { Theme } from '@/types/domain';

export const supabaseThemes: ThemesApi = {
  /** La RLS ya devuelve los del sistema más los míos (RF-T1). */
  async list() {
    return unwrap(
      await getSupabase().from('themes').select('*').order('is_system', { ascending: false }).order('name'),
    ) as Theme[];
  },

  async create(userId, input) {
    return unwrap(
      await getSupabase()
        .from('themes')
        .insert({ ...input, owner_id: userId, is_system: false })
        .select('*')
        .single(),
    ) as Theme;
  },

  /** Los temas del sistema no llegan aquí: la RLS no deja actualizarlos (RF-T3). */
  async update(id, patch) {
    return unwrap(
      await getSupabase().from('themes').update(patch).eq('id', id).select('*').single(),
    ) as Theme;
  },

  /**
   * RF-T6 · Las actividades conservan el color y el icono que se les copiaron al
   * guardarlas, y quedan sin tema: de eso se encarga el `on delete set null` del FK.
   */
  async remove(id) {
    const { error } = await getSupabase().from('themes').delete().eq('id', id);
    if (error) throw toError(error);
  },
};
