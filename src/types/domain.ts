/**
 * Tipos de dominio usados por UI, hooks y services. Cuando exista
 * types/database.ts (T029), los services mapean filas de BD a estos tipos.
 */
import type { Dimension } from '@/constants/dimensions';

export type AuthUser = {
  id: string;
  email: string;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
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
  is_gym: boolean;
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
};

export type CalendarVisibility = 'busy' | 'details';

export type ActivityShareStatus = 'pending' | 'accepted' | 'declined';

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
};

export type Workout = {
  id: string;
  activity_id: string | null;
  owner_id: string;
  performed_at: string;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  /** Título de la actividad ligada, si existe (RF-F7). */
  activity_title?: string | null;
  exercise_count?: number;
};

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
};

export type WorkoutInput = {
  activity_id?: string | null;
  performed_at: string;
  duration_minutes?: number | null;
  notes?: string | null;
};

export type WorkoutExerciseInput = Omit<WorkoutExercise, 'id' | 'workout_id' | 'position'> & { position?: number };
