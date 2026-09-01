/** Contratos que implementan el backend Supabase y el backend demo (memoria). */
import type { Activity, ActivityInput, AuthUser, Profile, Theme } from '@/types/domain';

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName?: string;
};

export type SignUpResult = {
  user: AuthUser | null;
  /** false cuando Supabase exige confirmar el correo antes de iniciar sesión. */
  sessionCreated: boolean;
};

export interface AuthApi {
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  isUsernameAvailable(username: string): Promise<boolean>;
}

export type ProfileUpdate = Pick<Profile, 'username' | 'display_name'>;

export interface ProfilesApi {
  getMyProfile(userId: string): Promise<Profile>;
  updateMyProfile(userId: string, patch: ProfileUpdate): Promise<Profile>;
}

export interface ActivitiesApi {
  /** Actividades que se traslapan con [from, to) (ISO UTC). */
  listByRange(userId: string, fromIso: string, toIso: string): Promise<Activity[]>;
  getById(id: string): Promise<Activity>;
  create(userId: string, input: ActivityInput): Promise<Activity>;
  update(id: string, patch: Partial<ActivityInput>): Promise<Activity>;
  remove(id: string): Promise<void>;
}

export interface ThemesApi {
  list(userId: string): Promise<Theme[]>;
}
