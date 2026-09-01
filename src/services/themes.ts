/** Temas (spec 05). Fachada sobre el backend activo. */
import { themesApi } from '@/services/backend';

export type { Theme } from '@/types/domain';

export const listThemes = themesApi.list;
