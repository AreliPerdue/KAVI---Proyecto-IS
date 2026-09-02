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
    const normalizedEmail = email.toLowerCase();
    const existing = demoState.accounts.find((a) => a.user.email === normalizedEmail);
    if (existing) {
      if (existing.password !== password) throw new AuthUiError(AUTH_MESSAGES.invalidCredentials);
      setCurrentUser(existing.user);
      return existing.user;
    }
    // Modo demo: cualquier correo nuevo entra directo (se crea la cuenta al vuelo).
    if (password.length < 8) throw new AuthUiError(AUTH_MESSAGES.invalidCredentials);
    const user = { id: nextId('user'), email: normalizedEmail };
    const base = normalizedEmail.split('@')[0]?.replace(/[^a-z0-9_]/g, '_') ?? 'usuario';
    demoState.accounts.push({
      user,
      password,
      profile: {
        id: user.id,
        username: base.slice(0, 30).padEnd(3, '_'),
        display_name: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    });
    setCurrentUser(user);
    return user;
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
