import type { ThemesApi } from '@/services/contracts';
import { delay, demoState } from '@/services/demo/store';

export const demoThemes: ThemesApi = {
  async list(userId) {
    await delay(80);
    return demoState.themes.filter((t) => t.is_system || t.owner_id === userId).map((t) => ({ ...t }));
  },
};
