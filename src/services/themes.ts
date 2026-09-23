/** Temas (spec 05). Fachada sobre el backend activo. */
import { themesApi } from '@/services/backend';

export type { Theme, ThemeInput } from '@/types/domain';

export const listThemes = themesApi.list;
export const createTheme = themesApi.create;
export const updateTheme = themesApi.update;
export const removeTheme = themesApi.remove;

/** Devuelve los temas del sistema a como vienen; no toca los propios (RF-T3). */
export const resetSystemThemes = themesApi.resetSystemThemes;
