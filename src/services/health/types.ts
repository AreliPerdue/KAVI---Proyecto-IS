/**
 * Datos de actividad desde la plataforma de salud del dispositivo (spec 11). Solo lectura.
 * Nada de esto se guarda en Supabase (decisión S4): vive en el dispositivo.
 */

/** De dónde viene un dato (RF-H5). `demo` son datos de ejemplo del modo demo. */
export type HealthSourceId = 'health_connect' | 'healthkit' | 'demo';

/** Nombre de cada fuente en español; en pantalla se usa `fitness.health.sources` del idioma activo. */
export const HEALTH_SOURCE_LABEL: Record<HealthSourceId, string> = {
  health_connect: 'Health Connect',
  healthkit: 'Salud de Apple',
  demo: 'Datos de ejemplo',
};

/** Lo que KAVI puede pedir leer en esta versión (RF-H2). */
export type HealthMetric = 'steps' | 'distance' | 'active_calories' | 'exercise_sessions';

export const HEALTH_METRICS: { id: HealthMetric; label: string; why: string }[] = [
  { id: 'steps', label: 'Pasos', why: 'Para ver cuánto te moviste en el día.' },
  { id: 'distance', label: 'Distancia', why: 'Los kilómetros que caminaste o corriste.' },
  { id: 'active_calories', label: 'Calorías activas', why: 'Las que tu teléfono o reloj asocian a moverte.' },
  { id: 'exercise_sessions', label: 'Entrenamientos de otras apps', why: 'Para verlos junto a los tuyos, sin duplicarlos.' },
];

/**
 * Si hay plataforma de salud y por qué no:
 * - `web`: el navegador no tiene acceso a datos de salud (excepción de P5).
 * - `unsupported`: el teléfono no la tiene, o todavía no hay adaptador para él.
 * - `needs_install`: existe pero hay que instalarla o actualizarla (Health Connect en Android 13 o antes).
 */
export type HealthAvailability =
  | { status: 'available'; source: HealthSourceId }
  | { status: 'web' | 'unsupported' | 'needs_install'; source: null; reason: HealthUnavailableReason };

/**
 * Por qué no hay datos, como clave: el texto lo pone la pantalla en el idioma activo
 * (`fitness.health.unavailable`), porque esta respuesta se guarda en caché y no se repide
 * al cambiar de idioma.
 */
export type HealthUnavailableReason = 'web' | 'ios_soon' | 'needs_health_connect' | 'no_health_connect';

export type HealthPermissions = Record<HealthMetric, boolean>;

export const NO_PERMISSIONS: HealthPermissions = { steps: false, distance: false, active_calories: false, exercise_sessions: false };

/** Totales de un día local ('yyyy-MM-dd'). `null` = sin permiso o sin dato, nunca 0 inventado. */
export type DailyTotals = {
  date: string;
  steps: number | null;
  distanceM: number | null;
  activeKcal: number | null;
  source: HealthSourceId;
};

/** Una sesión de ejercicio registrada por otra app (RF-H7). */
export type ExternalSession = {
  id: string;
  /** "Caminata", "Ciclismo"… ya en español. */
  title: string;
  startAt: string;
  endAt: string;
  activeKcal: number | null;
  /** La app que la registró, si la plataforma lo dice ("Reloj", "Strava"…). */
  app: string | null;
  source: HealthSourceId;
};

export interface HealthApi {
  availability(): Promise<HealthAvailability>;
  permissions(): Promise<HealthPermissions>;
  /** Pide permiso para estas métricas; la persona puede aceptar solo algunas (RF-H3). */
  requestPermissions(metrics: readonly HealthMetric[]): Promise<HealthPermissions>;
  dailyTotals(fromDay: string, toDay: string): Promise<DailyTotals[]>;
  exerciseSessions(fromIso: string, toIso: string): Promise<ExternalSession[]>;
  /** Olvida lo leído y, donde la plataforma lo permite, los permisos (RF-H8). */
  disconnect(): Promise<void>;
}
