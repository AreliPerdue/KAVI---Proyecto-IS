import { DEMO_OTP } from '@/constants/demo';
import { AUTH_MESSAGES, AuthUiError } from '@/lib/auth-errors';
import { availableUsername } from '@/lib/username';
import type { AuthApi } from '@/services/contracts';
import { delay, demoState, nextId, setCurrentUser } from '@/services/demo/store';

/** Altas a medias: correo verificado pero sin contraseña todavía. */
const pendingSignUps = new Map<string, { displayName: string }>();

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

  async startEmailSignUp(email, displayName) {
    await delay();
    const normalized = email.trim().toLowerCase();
    if (demoState.accounts.some((a) => a.user.email === normalized)) {
      throw new AuthUiError(AUTH_MESSAGES.emailTaken);
    }
    pendingSignUps.set(normalized, { displayName: displayName.trim() });
  },

  async verifyEmailOtp(email, code) {
    await delay();
    const normalized = email.trim().toLowerCase();
    const pending = pendingSignUps.get(normalized);
    if (!pending) throw new AuthUiError(AUTH_MESSAGES.expiredCode);
    if (code.trim() !== DEMO_OTP) throw new AuthUiError(AUTH_MESSAGES.invalidCode);

    const user = { id: nextId('user'), email: normalized };
    const username = await availableUsername(normalized, (candidate) =>
      demoAuth.isUsernameAvailable(candidate),
    );
    demoState.accounts.push({
      user,
      // Sin contraseña hasta el último paso: el alta se completa con `setPassword`.
      password: '',
      profile: {
        id: user.id,
        username,
        display_name: pending.displayName || null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    });
    pendingSignUps.delete(normalized);
    setCurrentUser(user);
    return user;
  },

  async setPassword(newPassword) {
    await delay();
    const current = demoState.currentUser;
    const account = current ? demoState.accounts.find((a) => a.user.id === current.id) : undefined;
    if (!account) throw new AuthUiError(AUTH_MESSAGES.generic);
    account.password = newPassword;
  },

  async changePassword(email, currentPassword, newPassword) {
    await delay();
    const normalized = email.trim().toLowerCase();
    const account = demoState.accounts.find((a) => a.user.email === normalized);
    if (!account || account.password !== currentPassword) {
      throw new AuthUiError(AUTH_MESSAGES.invalidCredentials);
    }
    if (account.password === newPassword) throw new AuthUiError(AUTH_MESSAGES.samePassword);
    account.password = newPassword;
  },

  async signIn(email, password) {
    await delay();
    const normalizedEmail = email.toLowerCase();
    const existing = demoState.accounts.find((a) => a.user.email === normalizedEmail);
    if (existing) {
      if (!existing.password || existing.password !== password) {
        throw new AuthUiError(AUTH_MESSAGES.invalidCredentials);
      }
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
