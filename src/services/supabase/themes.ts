import { getSupabase } from '@/lib/supabase';
import type { ThemesApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type { Theme, ThemeInput } from '@/types/domain';

/** Lo que una persona cambió de un tema del sistema; las columnas nulas heredan. */
type Override = { theme_id: string } & Partial<ThemeInput>;

/** Aplica la personalización sobre el tema original, campo a campo. */
function conOverride(theme: Theme, override: Override | undefined): Theme {
  if (!override) return theme;
  return {
    ...theme,
    name: override.name ?? theme.name,
    dimension: override.dimension ?? theme.dimension,
    color: override.color ?? theme.color,
    icon: override.icon ?? theme.icon,
  };
}

export const supabaseThemes: ThemesApi = {
  /**
   * La RLS ya devuelve los del sistema más los míos (RF-T1). Las personalizaciones se
   * piden aparte y se aplican aquí: la fila del sistema es global y no se puede tocar.
   */
  async list(userId) {
    const themes = unwrap(
      await getSupabase().from('themes').select('*').order('is_system', { ascending: false }).order('name'),
    ) as Theme[];

    /*
     * Las personalizaciones son un extra: si la consulta falla, la lista de temas sigue
     * sirviendo. Sin esto, una base a la que todavía no se le aplicó la migración
     * dejaba la pantalla entera en "algo salió mal", y los temas son lo que hace
     * funcionar al calendario.
     */
    const { data, error } = await getSupabase()
      .from('theme_overrides')
      .select('theme_id, name, dimension, color, icon')
      .eq('user_id', userId);
    if (error) return themes;

    const porTema = new Map((data as Override[]).map((o) => [o.theme_id, o]));
    return themes.map((t) => (t.is_system ? conOverride(t, porTema.get(t.id)) : t));
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

  /**
   * Un tema propio se actualiza en su fila. Uno del sistema **no**: esa fila la
   * comparten todas las cuentas, así que el cambio se guarda como personalización de
   * quien lo hace y se compone al leer.
   */
  async update(id, patch, userId) {
    const original = unwrap(
      await getSupabase().from('themes').select('*').eq('id', id).single(),
    ) as Theme;

    if (!original.is_system) {
      return unwrap(
        await getSupabase().from('themes').update(patch).eq('id', id).select('*').single(),
      ) as Theme;
    }

    const guardado = unwrap(
      await getSupabase()
        .from('theme_overrides')
        .upsert({ user_id: userId, theme_id: id, ...patch }, { onConflict: 'user_id,theme_id' })
        .select('theme_id, name, dimension, color, icon')
        .single(),
    ) as Override;
    return conOverride(original, guardado);
  },

  /**
   * RF-T6 · Las actividades conservan el color y el icono que se les copiaron al
   * guardarlas, y quedan sin tema: de eso se encarga el `on delete set null` del FK.
   */
  async remove(id) {
    const { error } = await getSupabase().from('themes').delete().eq('id', id);
    if (error) throw toError(error);
  },

  /**
   * Borra las personalizaciones de esta persona. Los temas propios viven en otra tabla,
   * así que no puede alcanzarlos ni por descuido.
   */
  async resetSystemThemes(userId) {
    const { error } = await getSupabase().from('theme_overrides').delete().eq('user_id', userId);
    if (error) throw toError(error);
  },
};
