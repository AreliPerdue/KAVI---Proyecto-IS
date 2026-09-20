import { AUTH_MESSAGES, AuthUiError } from '@/lib/auth-errors';
import type { ProfilesApi } from '@/services/contracts';
import { delay, demoState } from '@/services/demo/store';

export const demoProfiles: ProfilesApi = {
  async getMyProfile(userId) {
    await delay();
    const account = demoState.accounts.find((a) => a.user.id === userId);
    if (!account) throw new AuthUiError(AUTH_MESSAGES.generic);
    return { ...account.profile };
  },

  /** Equivale al trigger `normalize_username` + el índice único de la BD (RF-A9). */
  async updateMyProfile(userId, patch) {
    await delay();
    const account = demoState.accounts.find((a) => a.user.id === userId);
    if (!account) throw new AuthUiError(AUTH_MESSAGES.generic);

    if (patch.username !== undefined) {
      const username = patch.username.trim().toLowerCase();
      const taken = demoState.accounts.some(
        (a) => a.user.id !== userId && a.profile.username.toLowerCase() === username,
      );
      if (taken) throw new AuthUiError(AUTH_MESSAGES.usernameTaken);
      account.profile = { ...account.profile, username };
    }
    if (patch.display_name !== undefined) {
      account.profile = { ...account.profile, display_name: patch.display_name };
    }
    return { ...account.profile };
  },
};
