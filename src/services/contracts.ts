/** Contratos que implementan el backend Supabase y el backend demo (memoria). */
import type { RecurrenceRule } from '@/lib/recurrence';
import type { Activity, ActivityInput, AuthUser, Profile, Reminder, Theme, ThemeInput, UpcomingReminder } from '@/types/domain';

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

/** 'this' = solo esta ocurrencia; 'series' = toda la serie (RF-C8). */
export type RecurrenceScope = 'this' | 'series';

export type CreateActivityInput = ActivityInput & { recurrence?: RecurrenceRule | null };

export interface ActivitiesApi {
  /** Actividades que se traslapan con [from, to) (ISO UTC). */
  listByRange(userId: string, fromIso: string, toIso: string): Promise<Activity[]>;
  getById(id: string): Promise<Activity>;
  /** Con `recurrence`, crea la madre y materializa instancias a 90 días. */
  create(userId: string, input: CreateActivityInput): Promise<Activity>;
  update(id: string, patch: Partial<CreateActivityInput>, scope?: RecurrenceScope): Promise<Activity>;
  remove(id: string, scope?: RecurrenceScope): Promise<void>;
  /** Regenera instancias si alguna serie está por quedarse sin horizonte (plan §4). */
  extendRecurrenceHorizon(userId: string): Promise<void>;
}

export interface RemindersApi {
  /** Reminders de una actividad con mi estado enabled. */
  listByActivity(activityId: string, userId: string): Promise<Reminder[]>;
  /** Reemplaza el conjunto de offsets de la actividad (solo el dueño). */
  setForActivity(activityId: string, userId: string, offsets: number[]): Promise<Reminder[]>;
  /** Silenciar/activar mi copia (RF-S12). */
  setEnabled(reminderId: string, userId: string, enabled: boolean): Promise<void>;
  /** Todo lo que debo programar localmente en los próximos `horizonDays` (plan §3.4). */
  listUpcoming(userId: string, horizonDays: number): Promise<UpcomingReminder[]>;
}

export interface ThemesApi {
  list(userId: string): Promise<Theme[]>;
  create(userId: string, input: ThemeInput): Promise<Theme>;
  update(id: string, patch: Partial<ThemeInput>): Promise<Theme>;
  /** Las actividades conservan color/icono copiados y quedan sin tema (RF-T6). */
  remove(id: string): Promise<void>;
}
