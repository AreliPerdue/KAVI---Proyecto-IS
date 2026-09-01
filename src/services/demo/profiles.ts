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

  async updateMyProfile(userId, patch) {
    await delay();
    const account = demoState.accounts.find((a) => a.user.id === userId);
    if (!account) throw new AuthUiError(AUTH_MESSAGES.generic);
    const username = patch.username.toLowerCase();
    const taken = demoState.accounts.some(
      (a) => a.user.id !== userId && a.profile.username === username,
    );
    if (taken) throw new AuthUiError(AUTH_MESSAGES.usernameTaken);
    account.profile = { ...account.profile, username, display_name: patch.display_name };
    return { ...account.profile };
  },
};
