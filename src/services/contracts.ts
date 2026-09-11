/** Contratos que implementan el backend Supabase y el backend demo (memoria). */
import type { RecurrenceRule } from '@/lib/recurrence';
import type {
  Activity,
  ActivityInput,
  ActivityInvitation,
  ActivityShare,
  AuthUser,
  AvailabilityBlock,
  CalendarVisibility,
  Contact,
  Profile,
  Reminder,
  Theme,
  ThemeInput,
  UpcomingReminder,
  Workout,
  WorkoutExercise,
  WorkoutExerciseInput,
  WorkoutInput,
} from '@/types/domain';

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
  /**
   * Paso 1 del alta por pasos (RF-A8): envía un código de un solo uso al correo.
   * Falla si el correo ya tiene cuenta — el correo es el identificador único.
   */
  startEmailSignUp(email: string, displayName: string): Promise<void>;
  /** Paso 2: valida el código y deja la sesión abierta, todavía sin contraseña (RF-A8). */
  verifyEmailOtp(email: string, code: string): Promise<AuthUser>;
  /** Paso 3: fija la contraseña de la sesión recién verificada (RF-A8). */
  setPassword(newPassword: string): Promise<void>;
  /** Cambia la contraseña comprobando antes la actual (RF-A9). */
  changePassword(email: string, currentPassword: string, newPassword: string): Promise<void>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  isUsernameAvailable(username: string): Promise<boolean>;
}

/** El username ya no se edita: se genera al alta y no se muestra (RF-A9). */
export type ProfileUpdate = Pick<Profile, 'display_name'>;

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

export interface ConnectionsApi {
  /**
   * Búsqueda de personas por **correo exacto** (RF-S1): el correo es el identificador
   * único, y exigirlo completo evita que se pueda enumerar a quién hay registrado.
   * Excluye a mí mismo.
   */
  searchUsers(userId: string, email: string): Promise<Profile[]>;
  /** Contactos aceptados + solicitudes recibidas/enviadas (RF-S3). */
  listContacts(userId: string): Promise<Contact[]>;
  request(userId: string, addresseeId: string): Promise<void>;
  accept(userId: string, connectionId: string): Promise<void>;
  /** Rechazar solicitud o eliminar contacto; revoca todos los shares entre ambos (RF-S2). */
  remove(userId: string, connectionId: string): Promise<void>;
  /** Compartir mi calendario con un contacto (null = dejar de compartir) (RF-S7). */
  setCalendarVisibility(userId: string, contactUserId: string, visibility: CalendarVisibility | null): Promise<void>;
  /** Color con el que veo a un contacto al superponer calendarios (null = automático) (RF-S15). */
  setContactColor(userId: string, contactUserId: string, color: string | null): Promise<void>;
}

export interface SharesApi {
  /** Shares de una actividad (solo el dueño ve todos) (RF-S4). */
  listByActivity(activityId: string): Promise<(ActivityShare & { profile: Profile })[]>;
  shareActivity(userId: string, activityId: string, contactUserIds: string[]): Promise<void>;
  /** Invitaciones recibidas pendientes (RF-S5). */
  listInvitations(userId: string): Promise<ActivityInvitation[]>;
  respond(userId: string, shareId: string, accept: boolean): Promise<void>;
  /** Salirse de una actividad compartida o (dueño) revocar el share (RF-S6). */
  removeShare(userId: string, shareId: string): Promise<void>;
}

export interface AvailabilityApi {
  /** Bloques ocupados de los usuarios indicados (yo incluido) en [from, to); sin detalle si visibility=busy (RF-S8). */
  getAvailability(userId: string, userIds: string[], fromIso: string, toIso: string): Promise<AvailabilityBlock[]>;
}

export interface RealtimeApi {
  /** Avisa cuando cambian datos que me afectan; devuelve la función para desuscribirse (RF-S14). */
  subscribe(userId: string, onChange: () => void): () => void;
}

export type WorkoutDetail = Workout & { exercises: WorkoutExercise[] };

export interface WorkoutsApi {
  /** Historial cronológico descendente (RF-F7). */
  list(userId: string): Promise<Workout[]>;
  getById(id: string): Promise<WorkoutDetail>;
  /** Workout de una actividad (1:1) o null (RF-F1). */
  getByActivity(activityId: string, userId: string): Promise<WorkoutDetail | null>;
  create(userId: string, input: WorkoutInput): Promise<WorkoutDetail>;
  update(id: string, patch: Partial<WorkoutInput>): Promise<Workout>;
  remove(id: string): Promise<void>;
  addExercise(workoutId: string, input: WorkoutExerciseInput): Promise<WorkoutExercise>;
  updateExercise(id: string, patch: Partial<WorkoutExerciseInput>): Promise<WorkoutExercise>;
  removeExercise(id: string): Promise<void>;
  /** Nombres de ejercicio usados antes por la persona (RF-F4). */
  exerciseNames(userId: string): Promise<string[]>;
  /** Duplica en una actividad futura o como entrenamiento libre (RF-F8). */
  duplicate(userId: string, workoutId: string, target: { activityId: string | null; performedAt: string; keepValues: boolean }): Promise<WorkoutDetail>;
}
