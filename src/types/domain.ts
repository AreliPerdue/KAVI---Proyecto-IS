/**
 * Tipos de dominio usados por UI, hooks y services. Cuando exista
 * types/database.ts (T029), los services mapean filas de BD a estos tipos.
 */
import type { Dimension } from '@/constants/dimensions';

export type AuthUser = {
  id: string;
  email: string;
};

/** Rol de la cuenta (spec 09). Solo se cambia con SQL, nunca desde la app. */
export type UserRole = 'user' | 'adminkavi';

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  /** Fecha de nacimiento (RF-A10). La ven los contactos en su calendario. */
  birthday: string | null;
  created_at: string;
  role: UserRole;
};

/** Conteos agregados del producto (RF-AD4). Nunca contenido de nadie. */
export type AdminStats = {
  total_accounts: number;
  accounts_7d: number;
  accounts_30d: number;
  active_users_30d: number;
  total_activities: number;
  activities_30d: number;
  accepted_connections: number;
  shared_calendars: number;
  custom_themes: number;
  total_workouts: number;
};

/** Fila del listado de cuentas del panel (RF-AD5). */
export type AdminAccount = {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  activity_count: number;
  last_active_at: string | null;
};

export type Theme = {
  id: string;
  name: string;
  dimension: Dimension;
  color: string;
  icon: string;
  is_system: boolean;
  owner_id: string | null;
};

/**
 * Quién ve el título de una actividad (RF-C14).
 *
 * - `default`: quienes tengan tu calendario en modo «con detalles».
 * - `selected`: solo las personas elegidas, y aun así con «con detalles».
 * - `private`: nadie; todos ven el hueco como ocupado.
 *
 * Solo restringe, nunca amplía: el nivel del calendario es el techo.
 */
export type ActivityVisibility = 'default' | 'selected' | 'private';

export type Activity = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  theme_id: string | null;
  dimension: Dimension | null;
  color: string | null;
  icon: string | null;
  /** ISO UTC */
  start_at: string;
  /** ISO UTC */
  end_at: string;
  all_day: boolean;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  /** Días 'yyyy-MM-dd' que la serie ya no genera (EXDATE, T249). Solo en la madre. */
  recurrence_exdates?: string[];
  /**
   * Zona IANA de quien armó la serie (T272). Con ella la base sabe qué día local es cada
   * ocurrencia y se niega a recrear un día excluido, aunque lo intente una versión vieja.
   */
  recurrence_tz?: string | null;
  is_gym: boolean;
  /** Quién ve el título. El nivel del calendario sigue siendo el techo (RF-C14). */
  visibility: ActivityVisibility;
  created_at: string;
  updated_at: string;
  /** Solo en actividades compartidas conmigo: nombre visible del dueño (RF-S5, RF-S13). */
  owner_name?: string;
};

export type ConnectionStatus = 'pending' | 'accepted';

export type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  created_at: string;
  responded_at: string | null;
};

/** Conexión vista desde mí, con el perfil de la otra persona. */
export type Contact = {
  connection: Connection;
  profile: Profile;
  /** 'incoming' = me la enviaron; 'outgoing' = la envié; 'accepted' = contacto. */
  kind: 'incoming' | 'outgoing' | 'accepted';
  /** Cómo comparto MI calendario con esta persona (RF-S7). */
  myCalendarVisibility: CalendarVisibility | null;
  /** Cómo comparte esta persona SU calendario conmigo. */
  theirCalendarVisibility: CalendarVisibility | null;
  /** Color con el que veo sus actividades al superponer calendarios; null = automático (RF-S15). */
  color: string | null;
};

export type CalendarVisibility = 'busy' | 'details';

/**
 * Respuesta a una invitación (RF-S19).
 *
 * `maybe` existe porque «sí» o «no» no cubren el caso más común —quien aún no sabe—,
 * y sin él esa persona tiene que mentir o dejar la invitación sin responder, que
 * para quien organiza es indistinguible de que no la haya visto.
 */
export type ActivityShareStatus = 'pending' | 'accepted' | 'maybe' | 'declined';

export type ActivityShare = {
  id: string;
  activity_id: string;
  shared_with_id: string;
  status: ActivityShareStatus;
  created_at: string;
};

/** Invitación a una actividad, con lo necesario para mostrarla (RF-S5). */
export type ActivityInvitation = {
  share: ActivityShare;
  activity: Activity;
  owner: Profile;
};

/** Bloque ocupado sin detalle (visibility busy) o con título (details). */
export type AvailabilityBlock = {
  user_id: string;
  start_at: string;
  end_at: string;
  title: string | null;
  color: string | null;
};

export type Reminder = {
  id: string;
  activity_id: string;
  /** minutos antes de start_at (0 = al momento) */
  offset_minutes: number;
  created_by: string;
  created_at: string;
  /** Mi fila en reminder_recipients (RF-S12). */
  enabled: boolean;
};

/** Notificación pendiente de programar en este dispositivo. */
export type UpcomingReminder = {
  reminderId: string;
  activityId: string;
  title: string;
  body: string;
  fireAt: string;
  activityStartAt: string;
};

export type ThemeInput = {
  name: string;
  dimension: Dimension;
  color: string;
  icon: string;
};

export type ActivityInput = {
  title: string;
  description?: string | null;
  theme_id?: string | null;
  dimension?: Dimension | null;
  color?: string | null;
  icon?: string | null;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  is_gym?: boolean;
  /** Quién ve el título (RF-C14). Con 'selected', además, `viewerIds`. */
  visibility?: ActivityVisibility;
  /** Contactos que pueden ver el detalle cuando la visibilidad es 'selected'. */
  viewerIds?: string[];
};

export type Workout = {
  id: string;
  activity_id: string | null;
  owner_id: string;
  /** Nombre propio de la sesión (RF-F7). Sin él se usa el título de la actividad. */
  title: string | null;
  performed_at: string;
  /**
   * Derivado, no guardado: suma de la duración de sus ejercicios (RF-F3).
   * `null` cuando ninguno la tiene anotada.
   */
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  /** Spec 07 v2 · RF-F11. Las sesiones de v1 son `completed`. */
  status: WorkoutStatus;
  ended_at: string | null;
  /** Peso corporal del día, para el volumen de ejercicios de peso corporal (RF-F36). */
  bodyweight_kg: number | null;
  energy: number | null;
  pump: number | null;
  tags: string[];
  updated_at: string;
  /** Se marca al editar una sesión ya terminada (RF-F42). */
  edited_at: string | null;
  /** Título de la actividad ligada, si existe (RF-F7). */
  activity_title?: string | null;
  exercise_count?: number;
};

export type WorkoutStatus = 'active' | 'completed' | 'discarded';

export type WorkoutExercise = {
  id: string;
  workout_id: string;
  position: number;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  duration_minutes: number | null;
  notes: string | null;
  /** Ejercicio del catálogo (RF-F13). `null` = solo nombre libre, como en v1. */
  exercise_id?: string | null;
  group_id?: string | null;
  /** Posición dentro del grupo: 1 = A1, 2 = A2… */
  group_position?: number | null;
  protocol?: string | null;
  protocol_config?: Record<string, unknown> | null;
  rest_target_sec?: number | null;
  /** Cuándo se convirtió el texto libre de v1 en series (RF-F62). */
  legacy_converted_at?: string | null;
};

/** Un ejercicio de la sesión con sus series (RF-F13, RF-F14). */
export type WorkoutExerciseDetail = WorkoutExercise & { workout_sets: WorkoutSet[] };

export type WorkoutInput = {
  activity_id?: string | null;
  title?: string | null;
  performed_at: string;
  notes?: string | null;
  status?: WorkoutStatus;
  ended_at?: string | null;
  bodyweight_kg?: number | null;
  energy?: number | null;
  pump?: number | null;
  tags?: string[];
  edited_at?: string | null;
};

// ── Gym tracker v2 (spec 07 v2) ────────────────────────────────────────────────────

/** RF-F43 · Uno por serie. */
export type SetType =
  | 'warmup' | 'feeder' | 'working' | 'top_set' | 'backoff'
  | 'failure' | 'amrap' | 'technique' | 'max_test';

/** RF-F15 · Qué parte de la serie es un segmento. */
export type SegmentKind =
  | 'main' | 'drop' | 'rest_pause' | 'myo_activation' | 'myo_mini' | 'cluster'
  | 'forced' | 'negative' | 'partials' | 'iso_hold' | 'loaded_stretch'
  | 'twenty_ones_bottom' | 'twenty_ones_top' | 'twenty_ones_full' | 'bfr';

/** RF-F21 · Qué se mide en un ejercicio. Decide qué campos pide la fila y cómo se suma el volumen. */
export type TrackingType =
  | 'weight_reps' | 'bodyweight_reps' | 'weighted_bodyweight' | 'assisted_bodyweight'
  | 'reps_only' | 'duration' | 'weight_duration' | 'distance_duration' | 'weight_distance';

export type WeightUnit = 'kg' | 'lb';

/** RF-F45 */
export type ExerciseGroupType =
  | 'superset' | 'compound_set' | 'tri_set' | 'giant_set' | 'circuit'
  | 'pre_exhaust' | 'post_exhaust' | 'contrast' | 'paired_sets';

/** Ejercicio del catálogo: del sistema (`created_by` null) o personalizado (RF-F20, RF-F24). */
export type Exercise = {
  id: string;
  slug: string;
  name_es: string;
  name_en: string | null;
  aliases: string[];
  family: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  movement_pattern: string | null;
  mechanic: 'compound' | 'isolation' | null;
  laterality: 'bilateral' | 'unilateral' | 'alternating' | null;
  tracking_type: TrackingType;
  created_by: string | null;
  archived_at: string | null;
};

/** Lo planeado para una serie (objetivo de un protocolo o de la sesión duplicada). */
export type SetTarget = {
  reps_min?: number;
  reps_max?: number;
  weight_kg?: number;
  rir?: number;
  rpe?: number;
  duration_sec?: number;
};

/** Modificadores de carga (RF-F47). */
export type LoadMods = {
  added_kg?: number;
  assistance_kg?: number;
  bands?: string;
  chains_kg?: number;
  deficit_cm?: number;
  pin_height?: string;
};

/**
 * Un tramo de la serie (RF-F15). Una serie normal es un `main`; un drop set triple, una
 * serie con cuatro segmentos. El peso va siempre en kg; `input_unit` recuerda cómo se
 * escribió para mostrarlo igual.
 */
export type SetSegment = {
  id: string;
  set_id: string;
  sort_order: number;
  kind: SegmentKind;
  weight_kg: number | null;
  input_unit: WeightUnit;
  reps: number | null;
  reps_left: number | null;
  reps_right: number | null;
  partial_reps: number | null;
  forced_reps: number | null;
  cheat_reps: number | null;
  duration_sec: number | null;
  distance_m: number | null;
  rest_before_sec: number | null;
  variant_exercise_id: string | null;
  notes: string | null;
};

/** Una serie con sus segmentos (RF-F14). */
export type WorkoutSet = {
  id: string;
  workout_exercise_id: string;
  sort_order: number;
  set_type: SetType;
  intensifiers: string[];
  target: SetTarget | null;
  rpe: number | null;
  rir: number | null;
  failure: 'technical' | 'muscular' | 'absolute' | null;
  tempo: string | null;
  rom: 'full' | 'partial' | 'lengthened' | 'shortened' | null;
  side: 'both' | 'left' | 'right' | 'alternating' | null;
  load_mods: LoadMods | null;
  gear: string[];
  spotter: boolean;
  rest_after_sec: number | null;
  /** `null` = pendiente. */
  completed_at: string | null;
  notes: string | null;
  tags: string[];
  /** Creada por la conversión del texto de v1 (RF-F62). */
  from_legacy: boolean;
  segments: SetSegment[];
};

export type ExerciseGroup = {
  id: string;
  workout_id: string;
  type: ExerciseGroupType;
  rounds: number | null;
  rest_after_round_sec: number | null;
};

/** Lo que una persona marca de un ejercicio: favorito, nota fija y último uso (RF-F25, RF-F52). */
export type ExercisePrefs = {
  exercise_id: string;
  is_favorite: boolean;
  sticky_note: string | null;
  last_used_at: string | null;
};

/** Ejercicio personalizado (RF-F24). Solo el nombre es obligatorio. */
export type CustomExerciseInput = {
  name_es: string;
  tracking_type?: TrackingType;
  primary_muscles?: string[];
  equipment?: string[];
};

/** Decisión sobre una semana sin entreno (RF-F58). */
export type StreakEvent = {
  id: string;
  week_start: string;
  decision: 'kept' | 'reset';
  note: string | null;
  reasons: string[];
};

export type WorkoutExerciseInput = Omit<WorkoutExercise, 'id' | 'workout_id' | 'position'> & { position?: number };

// ── KAVI Lists (spec 10) ───────────────────────────────────────────────────────

/** Cómo se dibuja una lista por dentro (RF-L10). */
export type ListView = 'checklist' | 'grid';

export type KaviList = {
  id: string;
  owner_id: string;
  name: string;
  /** Nombre de icono del catálogo de `constants/icons`. */
  icon: string;
  /** Hex de la paleta de personas: Lists no estrena un tercer sistema de color. */
  color: string;
  view: ListView;
  is_pinned: boolean;
  is_archived: boolean;
  /**
   * Orden entre listas. Es `number` y no un entero de posición para poder insertar
   * entre dos vecinas escribiendo una sola fila: con enteros, arrastrar una lista
   * obliga a renumerar todas las de abajo, y en una lista compartida dos personas
   * reordenando a la vez se pisan.
   */
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Derivados para la tarjeta del inicio (RF-L1). */
  pending_count: number;
  total_count: number;
  /**
   * Etiquetas **mías** puestas a esta lista (RF-L22). Viajan con la lista para poder
   * filtrar el inicio sin una consulta por tarjeta.
   */
  tag_ids: string[];
  /** RRULE si la lista se repite; `null` si es de una sola vez (RF-L19). */
  recurrence_rule: string | null;
  /** Día desde el que cuenta la regla: sin ancla, "cada lunes" no sabe cuál fue el primero. */
  recurrence_start: string | null;
  /**
   * Para cuándo tiene que estar lista **entera** (RF-L23). Fecha flotante, como la de los
   * elementos. No sustituye a las suyas: "la maleta es para el sábado" y "comprar pilas el
   * jueves" conviven.
   */
  due_date: string | null;
};

/**
 * Una vuelta de una lista que se repite (RF-L20).
 *
 * Sigue abierta y editable hasta las 15:00 del día siguiente —la gente palomea tarde— y al
 * cerrarse se queda solo con los conteos: el historial no guarda copias de los elementos.
 */
export type ListRun = {
  id: string;
  list_id: string;
  /** Día al que pertenece la vuelta, en `YYYY-MM-DD`. Es una fecha flotante, como `due_date`. */
  run_date: string;
  closed_at: string | null;
  completed_count: number;
  total_count: number;
  /** Elementos palomeados en **esta** vuelta. Vacío en las ya cerradas. */
  completed_item_ids: string[];
};

/** Etiqueta propia para agrupar listas por tema (RF-L22). */
export type ListTag = {
  id: string;
  owner_id: string;
  name: string;
  /** Cuántas listas la llevan; derivado, para la fila de filtros del inicio. */
  list_count: number;
};

export type ListSection = {
  id: string;
  list_id: string;
  name: string;
  sort_order: number;
};

export type ListItem = {
  id: string;
  list_id: string;
  section_id: string | null;
  title: string;
  note: string | null;
  sort_order: number;
  /** `null` mientras esté pendiente; la fecha ISO en que se palomeó (RF-L6). */
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  /**
   * Fecha **flotante** (`YYYY-MM-DD`), no un instante UTC (RF-L11).
   *
   * Excepción consciente a la regla de fechas de CLAUDE.md: "el sábado" no es un punto
   * en el tiempo sino un día del calendario de quien lo escribió. Guardado como
   * `timestamptz` se correría de día al cruzar husos horarios.
   */
  due_date: string | null;
  /** Hora opcional del vencimiento. No coloca el ítem en la rejilla (RF-L12). */
  due_time: string | null;
  /**
   * Minutos **antes** del vencimiento en que avisar; `null` = sin recordatorio (RF-L11b).
   *
   * Va aparte de `due_time` porque son preguntas distintas: la hora dice *cuándo es* y
   * esto *cuándo avisar*. "Se entrega el 3, avísame el 1" necesita las dos.
   */
  reminder_offset_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type ListInput = Pick<KaviList, 'name' | 'icon' | 'color'> & Partial<Pick<KaviList, 'view'>>;
export type ListItemInput = Pick<ListItem, 'title'> &
  Partial<Pick<ListItem, 'note' | 'section_id' | 'due_date' | 'due_time' | 'reminder_offset_minutes'>>;
/**
 * Al agregar, el id y el orden pueden venir del cliente (T268): así el elemento se pinta en el
 * acto con el mismo id que tendrá en la base, y guardarlo es un solo viaje al servidor.
 */
export type NewListItemInput = ListItemInput & Partial<Pick<ListItem, 'id' | 'sort_order'>>;
