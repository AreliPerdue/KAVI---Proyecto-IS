/** Contratos que implementan el backend Supabase y el backend demo (memoria). */
import type { ConsentStatus, GuardianStatus } from '@/lib/consent';
import type { RecurrenceRule } from '@/lib/recurrence';
import type {
  Activity,
  StreakEvent,
  KaviList,
  ListInput,
  ListItem,
  ListItemInput,
  NewListItemInput,
  ListSection,
  ListRun,
  ListTag,
  AdminAccount,
  AdminStats,
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
  WorkoutExerciseDetail,
  WorkoutSet,
  ExerciseGroup,
  Exercise,
  ExercisePrefs,
  CustomExerciseInput,
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
   * Envía el código de un solo uso al correo (RF-A8). El username viaja aquí porque
   * la cuenta se crea al verificar el código, y es el trigger de la base quien lo
   * escribe: si se mandara después habría una ventana con el username provisional.
   * Falla si el correo ya tiene cuenta — el correo es el identificador único.
   */
  startEmailSignUp(email: string, displayName: string, username: string): Promise<void>;
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
  /**
   * Elimina la cuenta y todos sus datos, de inmediato y sin vuelta atrás (RF-A12). Comprueba antes
   * la contraseña, igual que al cambiarla, y cierra la sesión al terminar.
   */
  deleteAccount(email: string, password: string): Promise<void>;
}

/** Nombre visible y username, ambos editables desde Perfil (RF-A9). */
/** Las tres respuestas posibles: `pending` es la ausencia de respuesta. */
export type ActivityShareResponse = 'accepted' | 'maybe' | 'declined';

export type ProfileUpdate = Partial<Pick<Profile, 'display_name' | 'username' | 'avatar_url' | 'birthday'>>;

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
  /** Los del sistema llegan ya con la personalización de esta persona aplicada (RF-T3). */
  list(userId: string): Promise<Theme[]>;
  create(userId: string, input: ThemeInput): Promise<Theme>;
  /**
   * Editar un tema **propio** cambia la fila; editar uno **del sistema** guarda una
   * personalización de esta persona, porque esa fila la comparten todas las cuentas.
   */
  update(id: string, patch: Partial<ThemeInput>, userId: string): Promise<Theme>;
  /** Las actividades conservan color/icono copiados y quedan sin tema (RF-T6). */
  remove(id: string): Promise<void>;
  /** Devuelve los temas del sistema a como vienen. No toca los temas propios (RF-T3). */
  resetSystemThemes(userId: string): Promise<void>;
}

export interface ConnectionsApi {
  /**
   * Búsqueda por **correo exacto o @username exacto** (RF-S1). Exigir la cadena
   * completa —nunca un prefijo— es lo que impide enumerar quién está registrado.
   * La arroba inicial es opcional. Excluye a quien busca.
   */
  searchUsers(userId: string, query: string): Promise<Profile[]>;
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
  /** Responder a una invitación (RF-S19). `maybe` cuenta como asistencia posible. */
  respond(userId: string, shareId: string, respuesta: ActivityShareResponse): Promise<void>;
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

/** Una sesión con sus ejercicios, cada uno con sus series y segmentos (spec 07 v2). */
export type WorkoutDetail = Workout & { exercises: WorkoutExerciseDetail[]; groups: ExerciseGroup[] };

/**
 * Lo hecho en un ejercicio en una sesión pasada (RF-F26, RF-F27, RF-F56). Es la base de
 * "Anterior", de los PRs y del detalle del ejercicio.
 */
export type ExerciseHistoryEntry = {
  workout_id: string;
  workout_exercise_id: string;
  performed_at: string;
  bodyweight_kg: number | null;
  sets: WorkoutSet[];
};

/** Una nota encontrada al buscar en el historial (RF-F53). */
export type NoteHit = {
  workout_id: string;
  performed_at: string;
  /** Nombre de la sesión, si tiene. */
  title: string | null;
  where: 'session' | 'exercise' | 'set';
  /** El ejercicio donde está la nota, si no es de la sesión. */
  exercise_name: string | null;
  text: string;
};

/** Cómo se identifica un ejercicio en el historial: por catálogo o, si no está ligado, por nombre. */
export type ExerciseRef = { exerciseId: string | null; name: string };

/** Un ejercicio de v1 con texto todavía sin convertir, con la fecha de su sesión (RF-F62). */
export type LegacyExercise = WorkoutExercise & { performed_at: string };

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
  /** Borrado suave (RF-F16): el ejercicio y sus series dejan de verse pero no se pierden. */
  removeExercise(id: string): Promise<void>;
  /** Deshace `removeExercise` (RF-F6). */
  restoreExercise(id: string): Promise<void>;
  /**
   * Guarda series completas con sus segmentos: `upsert` por id, así reenviar tras un
   * cierre no duplica (RF-F17, RF-F18). Los segmentos de esas series que ya no vienen se
   * borran (suave): es como se quita un drop.
   */
  saveSets(sets: readonly WorkoutSet[]): Promise<void>;
  /** Borrado suave de series. */
  removeSets(ids: readonly string[]): Promise<void>;
  /**
   * Agrupa ejercicios de la sesión (RF-F45): superserie, circuito… El orden de los ids es
   * el de A1, A2, A3; quedan seguidos en la sesión, en la posición del primero.
   */
  createGroup(workoutId: string, input: { type: ExerciseGroup['type']; exerciseIds: readonly string[]; rounds?: number | null; rest_after_round_sec?: number | null }): Promise<ExerciseGroup>;
  /** Deshace un grupo: sus ejercicios vuelven a ser sueltos y conservan sus series. */
  removeGroup(groupId: string): Promise<void>;
  /** Ejercicios con texto de v1 sin convertir todavía (RF-F62). */
  listLegacyExercises(userId: string): Promise<LegacyExercise[]>;
  /** Marca ejercicios como convertidos; así no se vuelven a convertir (RF-F62). */
  markLegacyConverted(exerciseIds: readonly string[]): Promise<void>;
  /**
   * Historial de un ejercicio, de la sesión más reciente a la más antigua. Sin sesiones
   * borradas ni descartadas. Incluye la sesión actual si la hay: quien llama la filtra.
   */
  exerciseHistory(userId: string, ref: ExerciseRef, limit?: number): Promise<ExerciseHistoryEntry[]>;
  /** Busca en las notas de sesiones, ejercicios y series (RF-F53), de lo más reciente a lo más viejo. */
  searchNotes(userId: string, term: string): Promise<NoteHit[]>;
  /** Nombres de ejercicio usados antes por la persona, del más usado al menos (RF-F4). */
  exerciseNames(userId: string): Promise<string[]>;
  /**
   * Sesiones terminadas con todo su detalle, de la más vieja a la más reciente. De aquí se
   * calculan logros, racha y volumen por músculo (RF-F57 – RF-F60): nada de eso se guarda
   * aparte, así que editar una sesión los recalcula solo.
   */
  trainingLog(userId: string): Promise<WorkoutDetail[]>;
  /** Decisiones sobre semanas sin entreno (RF-F58). */
  listStreakEvents(userId: string): Promise<StreakEvent[]>;
  /** Guarda una decisión por semana; si la semana ya tenía una, la reemplaza. */
  saveStreakEvents(userId: string, events: readonly Omit<StreakEvent, 'id'>[]): Promise<void>;
  /** Duplica en una actividad futura o como entrenamiento libre (RF-F8). */
  duplicate(userId: string, workoutId: string, target: { activityId: string | null; performedAt: string; keepValues: boolean }): Promise<WorkoutDetail>;
}

/** Catálogo de ejercicios y lo que cada persona marca de ellos (spec 07 v2, §4). */
export interface ExercisesApi {
  /**
   * Catálogo del sistema más los personalizados propios, archivados incluidos: el historial
   * tiene que poder nombrar un ejercicio aunque ya no se ofrezca en el selector.
   */
  list(userId: string): Promise<Exercise[]>;
  /** Crea un personalizado; también al escribir un nombre que no existe (RF-F24). */
  createCustom(userId: string, input: CustomExerciseInput): Promise<Exercise>;
  /** Renombra o archiva un personalizado. Los del sistema no se tocan. */
  updateCustom(id: string, patch: Partial<CustomExerciseInput> & { archived?: boolean }): Promise<Exercise>;
  listPrefs(userId: string): Promise<ExercisePrefs[]>;
  /** Guarda solo lo que viene: marcar favorito no borra la nota fija. */
  savePrefs(userId: string, exerciseId: string, patch: Partial<Omit<ExercisePrefs, 'exercise_id'>>): Promise<void>;
}

/**
 * Spec 09 · Panel de administración. Solo agregados: si algún día hiciera falta
 * mostrar contenido, sería otra decisión de producto y otra spec.
 */
export interface AdminApi {
  getStats(): Promise<AdminStats>;
  listAccounts(): Promise<AdminAccount[]>;
}

/** Detalle de una lista: la lista, sus secciones y sus ítems (spec 10). */
export type ListDetail = {
  list: KaviList;
  sections: ListSection[];
  items: ListItem[];
};

/** Lo básico de Lists; `ListsApi` lo junta con compartir, etiquetas y vueltas. */
export interface ListsCoreApi {
  /** Listas activas de quien mira, fijadas primero (RF-L1, RF-L3). */
  list(userId: string): Promise<KaviList[]>;
  /** Archivadas, que viven fuera del inicio (RF-L2). */
  listArchived(userId: string): Promise<KaviList[]>;
  getById(listId: string): Promise<ListDetail>;
  create(userId: string, input: ListInput): Promise<KaviList>;
  update(
    listId: string,
    patch: Partial<
      ListInput &
        Pick<KaviList, 'is_pinned' | 'is_archived' | 'view' | 'recurrence_rule' | 'recurrence_start' | 'due_date'>
    >,
  ): Promise<KaviList>;
  remove(listId: string): Promise<void>;
  /** Copia la lista con sus secciones e ítems pendientes (RF-L2). */
  duplicate(listId: string): Promise<KaviList>;
  reorder(listId: string, sortOrder: number): Promise<void>;

  addSection(listId: string, name: string): Promise<ListSection>;
  renameSection(sectionId: string, name: string): Promise<ListSection>;
  removeSection(sectionId: string): Promise<void>;

  addItem(listId: string, userId: string, input: NewListItemInput): Promise<ListItem>;
  updateItem(itemId: string, patch: Partial<ListItemInput>): Promise<ListItem>;
  removeItem(itemId: string): Promise<void>;
  /** Palomear y despalomear. Nunca borra: es lo que permite deshacer un dedazo (RF-L6). */
  toggleItem(itemId: string, userId: string, done: boolean): Promise<ListItem>;
  reorderItem(itemId: string, sortOrder: number, sectionId: string | null): Promise<void>;

  /**
   * Ítems con fecha dentro de [from, to], para la franja del día (RF-L12).
   * Fechas en `YYYY-MM-DD`, no ISO: son fechas flotantes, no instantes.
   */
  listByDateRange(userId: string, fromDate: string, toDate: string): Promise<ListItem[]>;

  /**
   * Pendientes con fecha **anterior** a `beforeDate` y todavía sin palomear.
   *
   * Va aparte de `listByDateRange` y no como un rango abierto porque lo vencido no tiene
   * inicio: una compra apuntada hace tres meses sigue pendiente, y elegir una ventana
   * arbitraria la escondería justo cuando más lleva esperando.
   */
  listOverdue(userId: string, beforeDate: string): Promise<ListItem[]>;

  /**
   * Pendientes **sin fecha** de mis listas activas, para la bandeja de Algún día (RF-L25).
   *
   * Excluye las rutinas: sus elementos no están esperando a que alguien les ponga día, los
   * repite la propia lista.
   */
  listUndated(userId: string): Promise<ListItem[]>;

  /** Mueve varios pendientes a una fecha nueva de una sola vez (reprogramar). */
  rescheduleItems(itemIds: readonly string[], dueDate: string): Promise<void>;

  /**
   * Busca por nombre de lista y por texto de elemento, **completados incluidos** (RF-L4).
   *
   * Lo ya palomeado entra a propósito: media búsqueda en una lista es para recordar si algo
   * se compró o no, y esconder lo hecho responde justo lo contrario de lo que se pregunta.
   */
  search(userId: string, term: string): Promise<ListSearchResults>;
}

export interface ListTagsApi {
  /** Mis etiquetas, con cuántas listas lleva cada una (RF-L22). */
  listTags(userId: string): Promise<ListTag[]>;
  /** Crea una etiqueta, o devuelve la que ya existe con ese nombre. */
  createTag(userId: string, name: string): Promise<ListTag>;
  renameTag(tagId: string, name: string): Promise<ListTag>;
  /** Borra la etiqueta y sus vínculos. Ninguna lista se pierde. */
  removeTag(tagId: string): Promise<void>;
  /** Etiquetas de una lista concreta. */
  tagsOfList(listId: string, userId: string): Promise<ListTag[]>;
  setListTag(listId: string, tagId: string, puesta: boolean): Promise<void>;
}

export interface ListRunsApi {
  /**
   * Pone al día las vueltas de una lista que se repite y devuelve las **abiertas** (RF-L20).
   *
   * Hace tres cosas en una sola llamada porque ninguna tiene sentido sin las otras: cierra
   * las vueltas cuya gracia ya venció, abre la de hoy si la regla cae hoy, y devuelve lo que
   * quedó abierto. Separarlas obligaría a la pantalla a orquestar el ciclo de vida de algo
   * que no le incumbe.
   */
  syncRuns(listId: string, hoy: string): Promise<ListRun[]>;
  /** Palomea o despalomea un elemento **dentro de una vuelta**. */
  setRunItem(runId: string, itemId: string, userId: string, done: boolean): Promise<void>;
  /** Historial cerrado, de lo más reciente a lo más viejo (RF-L21). */
  listRuns(listId: string, limit?: number): Promise<ListRun[]>;
  /**
   * Vueltas de **todas** mis rutinas dentro de [from, to], abiertas y cerradas, para que el
   * calendario pinte el avance de cada día (RF-L26). Solo lee: no abre ni cierra ninguna,
   * eso sigue siendo cosa de `syncRuns` al abrir la lista.
   */
  listRunsByDateRange(userId: string, fromDate: string, toDate: string): Promise<ListRun[]>;
}

export interface ListsApi extends ListsCoreApi, ListSharesApi, ListTagsApi, ListRunsApi {}

export type ListSearchResults = {
  lists: KaviList[];
  items: ListItem[];
};

/** Lo que la interfaz ofrece al compartir. El esquema admite además `manage` (RF-L14). */
export type ListPermission = 'view' | 'edit';

/** Con quién está compartida una lista y con qué permiso. */
export type ListShare = {
  id: string;
  list_id: string;
  shared_with_id: string;
  permission: ListPermission;
  profile: Profile;
};

export interface ListSharesApi {
  /** Con quién está compartida una lista (RF-L14). */
  listShares(listId: string): Promise<ListShare[]>;
  /** Comparte o cambia el permiso de alguien. Solo con contactos aceptados. */
  share(listId: string, userId: string, permission: ListPermission): Promise<ListShare>;
  /** Retira el acceso. No borra nada del contenido (RF-L17). */
  unshare(listId: string, userId: string): Promise<void>;
  /** Listas que otras personas comparten conmigo, para el inicio (RF-L1). */
  sharedWithMe(userId: string): Promise<KaviList[]>;
}

/** Edad mínima y consentimiento (spec 03, RF-A13). */
export interface ConsentApi {
  /** Lo que la cuenta ya declaró y aceptó, y la última solicitud a su madre, padre o tutor. */
  getStatus(): Promise<ConsentStatus>;
  /** Guarda la fecha de nacimiento y la aceptación expresa del aviso en su versión vigente. */
  accept(birthDate: string, privacyVersion: string): Promise<void>;
  /**
   * Manda el correo al adulto. El enlace lo genera el servidor y la app nunca lo ve; en demo,
   * donde no hay correo, se devuelve para poder abrirlo (`previewLink`).
   */
  requestGuardianApproval(guardianEmail: string): Promise<{ previewLink: string | null }>;
  /** Lo que ve el adulto al abrir el enlace, sin iniciar sesión; `null` si el enlace no existe. */
  guardianRequestInfo(token: string): Promise<{ minorName: string; status: GuardianStatus; expiresAt: string } | null>;
  /** El adulto aprueba o no. Repetir devuelve la decisión que ya se tomó. */
  decideGuardianRequest(token: string, approve: boolean): Promise<GuardianStatus>;
  /** Menores de 16: la cuenta se elimina con su sesión actual, sin pedir la contraseña otra vez. */
  deleteUnderageAccount(): Promise<void>;
}
