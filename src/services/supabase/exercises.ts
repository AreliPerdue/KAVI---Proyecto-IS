import { uuidv4 } from '@/lib/gym/ids';
import { getSupabase } from '@/lib/supabase';
import type { ExercisesApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type { Exercise, ExercisePrefs } from '@/types/domain';

/** Lo que el dominio no conoce: marcas de tiempo internas. */
function aEjercicio(row: Exercise & { created_at?: string; updated_at?: string }): Exercise {
  const { created_at: _c, updated_at: _u, ...e } = row;
  return e;
}

export const supabaseExercises: ExercisesApi = {
  /**
   * La RLS ya limita esto a los del sistema y los propios. Son ~530 filas, por debajo del
   * tope de 1000 que PostgREST devuelve de una vez; el `range` lo deja explícito.
   */
  async list() {
    const rows = unwrap(await getSupabase().from('exercises').select('*').order('name_es').range(0, 1999)) as Exercise[];
    return rows.map(aEjercicio);
  },

  async createCustom(userId, input) {
    const id = uuidv4();
    const row = unwrap(
      await getSupabase()
        .from('exercises')
        .insert({
          id,
          slug: `custom-${id}`,
          name_es: input.name_es.trim(),
          tracking_type: input.tracking_type ?? 'weight_reps',
          primary_muscles: input.primary_muscles ?? [],
          equipment: input.equipment ?? [],
          created_by: userId,
        })
        .select('*')
        .single(),
    ) as Exercise;
    return aEjercicio(row);
  },

  async updateCustom(id, patch) {
    const { archived, name_es, ...resto } = patch;
    const cambios = {
      ...resto,
      ...(name_es !== undefined ? { name_es: name_es.trim() } : {}),
      ...(archived !== undefined ? { archived_at: archived ? new Date().toISOString() : null } : {}),
    };
    const row = unwrap(await getSupabase().from('exercises').update(cambios).eq('id', id).select('*').single()) as Exercise;
    return aEjercicio(row);
  },

  async listPrefs(userId) {
    return unwrap(
      await getSupabase()
        .from('user_exercise_prefs')
        .select('exercise_id, is_favorite, sticky_note, last_used_at')
        .eq('owner_id', userId),
    ) as ExercisePrefs[];
  },

  /**
   * Upsert de **un** objeto: solo viajan las columnas del parche, así que marcar favorito no
   * pisa la nota fija. (Con un arreglo de objetos, supabase-js pondría en null lo que falte.)
   */
  async savePrefs(userId, exerciseId, patch) {
    const { error } = await getSupabase()
      .from('user_exercise_prefs')
      .upsert({ owner_id: userId, exercise_id: exerciseId, ...patch }, { onConflict: 'owner_id,exercise_id' });
    if (error) throw toError(error);
  },
};
