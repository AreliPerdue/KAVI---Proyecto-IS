import { AUTH_MESSAGES, AuthUiError } from '@/lib/auth-errors';
import type { AuthApi } from '@/services/contracts';
import { delay, demoState, nextId, setCurrentUser } from '@/services/demo/store';

/** Auth demo: cualquier cuenta creada en la sesión, más demo@kavi.app / demo1234. */
export const demoAuth: AuthApi = {
  async isUsernameAvailable(username) {
    await delay(100);
    return !demoState.accounts.some((a) => a.profile.username === username.toLowerCase());
  },

  async signUp({ email, password, username, displayName }) {
    await delay();
    const normalized = username.toLowerCase();
    if (demoState.accounts.some((a) => a.profile.username === normalized)) {
      throw new AuthUiError(AUTH_MESSAGES.usernameTaken);
    }
    if (demoState.accounts.some((a) => a.user.email === email.toLowerCase())) {
      throw new AuthUiError(AUTH_MESSAGES.emailTaken);
    }
    const user = { id: nextId('user'), email: email.toLowerCase() };
    demoState.accounts.push({
      user,
      password,
      profile: {
        id: user.id,
        username: normalized,
        display_name: displayName ?? null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    });
    setCurrentUser(user);
    return { user, sessionCreated: true };
  },

  async signIn(email, password) {
    await delay();
    const account = demoState.accounts.find(
      (a) => a.user.email === email.toLowerCase() && a.password === password,
    );
    if (!account) throw new AuthUiError(AUTH_MESSAGES.invalidCredentials);
    setCurrentUser(account.user);
    return account.user;
  },

  async signOut() {
    await delay(100);
    setCurrentUser(null);
  },

  async resetPassword() {
    await delay();
  },

  async getSession() {
    return demoState.currentUser;
  },

  onAuthStateChange(callback) {
    demoState.listeners.add(callback);
    return () => {
      demoState.listeners.delete(callback);
    };
  },
};
