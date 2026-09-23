import { AuthUiError } from '@/lib/auth-errors';
import type { ThemesApi } from '@/services/contracts';
import { delay, demoState, nextId } from '@/services/demo/store';
import type { Theme, ThemeInput } from '@/types/domain';

function buscar(id: string): Theme {
  const theme = demoState.themes.find((t) => t.id === id);
  if (!theme) throw new AuthUiError('Ese tema ya no existe.');
  return theme;
}

/** Aplica la personalización de una persona sobre el tema original, campo a campo. */
function conOverride(theme: Theme, override: Partial<ThemeInput> | undefined): Theme {
  if (!override) return theme;
  return {
    ...theme,
    name: override.name ?? theme.name,
    dimension: override.dimension ?? theme.dimension,
    color: override.color ?? theme.color,
    icon: override.icon ?? theme.icon,
  };
}

export const demoThemes: ThemesApi = {
  async list(userId) {
    await delay(80);
    return demoState.themes
      .filter((t) => t.is_system || t.owner_id === userId)
      .map((t) => (t.is_system ? conOverride(t, demoState.themeOverrides[`${userId}:${t.id}`]) : { ...t }));
  },

  async create(userId, input) {
    await delay();
    const theme: Theme = { id: nextId('theme'), ...input, name: input.name.trim(), is_system: false, owner_id: userId };
    demoState.themes.push(theme);
    return { ...theme };
  },

  /**
   * Un tema propio se edita en su fila. Uno del sistema no: esa fila la comparten todas
   * las cuentas, así que el cambio se guarda como personalización de quien lo hace.
   */
  async update(id, patch, userId) {
    await delay();
    const current = buscar(id);
    const limpio = patch.name === undefined ? patch : { ...patch, name: patch.name.trim() };

    if (current.is_system) {
      const clave = `${userId}:${id}`;
      const guardado = { ...(demoState.themeOverrides[clave] ?? {}), ...limpio };
      demoState.themeOverrides[clave] = guardado;
      return conOverride(current, guardado);
    }

    const updated: Theme = { ...current, ...limpio };
    demoState.themes = demoState.themes.map((t) => (t.id === id ? updated : t));
    // Las actividades con este tema reflejan el nuevo estilo (copia de estilo).
    demoState.activities = demoState.activities.map((a) =>
      a.theme_id === id ? { ...a, color: updated.color, icon: updated.icon, dimension: updated.dimension } : a,
    );
    return { ...updated };
  },

  async remove(id) {
    await delay();
    const theme = buscar(id);
    if (theme.is_system) throw new AuthUiError('Los temas del sistema no se pueden borrar.');
    demoState.themes = demoState.themes.filter((t) => t.id !== id);
    // FK on delete set null: conservan color/icono copiados (RF-T6).
    demoState.activities = demoState.activities.map((a) => (a.theme_id === id ? { ...a, theme_id: null } : a));
  },

  /** Solo las personalizaciones: los temas propios viven en otra lista y no se tocan. */
  async resetSystemThemes(userId) {
    await delay();
    for (const clave of Object.keys(demoState.themeOverrides)) {
      if (clave.startsWith(`${userId}:`)) delete demoState.themeOverrides[clave];
    }
  },
};
