import { AUTH_MESSAGES, AuthUiError } from '@/lib/auth-errors';
import type { ThemesApi } from '@/services/contracts';
import { delay, demoState, nextId } from '@/services/demo/store';
import type { Theme } from '@/types/domain';

function ownTheme(id: string): Theme {
  const theme = demoState.themes.find((t) => t.id === id);
  if (!theme) throw new AuthUiError('Ese tema ya no existe.');
  if (theme.is_system) throw new AuthUiError('Los temas del sistema no se pueden modificar.');
  return theme;
}

export const demoThemes: ThemesApi = {
  async list(userId) {
    await delay(80);
    return demoState.themes.filter((t) => t.is_system || t.owner_id === userId).map((t) => ({ ...t }));
  },

  async create(userId, input) {
    await delay();
    const theme: Theme = { id: nextId('theme'), ...input, name: input.name.trim(), is_system: false, owner_id: userId };
    demoState.themes.push(theme);
    return { ...theme };
  },

  async update(id, patch) {
    await delay();
    const current = ownTheme(id);
    const updated: Theme = { ...current, ...patch, name: (patch.name ?? current.name).trim() };
    demoState.themes = demoState.themes.map((t) => (t.id === id ? updated : t));
    // Las actividades con este tema reflejan el nuevo estilo (copia de estilo).
    demoState.activities = demoState.activities.map((a) =>
      a.theme_id === id ? { ...a, color: updated.color, icon: updated.icon, dimension: updated.dimension } : a,
    );
    return { ...updated };
  },

  async remove(id) {
    await delay();
    ownTheme(id);
    demoState.themes = demoState.themes.filter((t) => t.id !== id);
    // FK on delete set null: conservan color/icono copiados (RF-T6).
    demoState.activities = demoState.activities.map((a) => (a.theme_id === id ? { ...a, theme_id: null } : a));
    if (!demoState.themes.length) throw new AuthUiError(AUTH_MESSAGES.generic);
  },
};
