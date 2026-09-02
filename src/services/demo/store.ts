/**
 * Estado en memoria del modo demo. Se reinicia al recargar la app.
 * Sirve para desarrollar y probar el frontend sin backend.
 */
import { addDays, addHours, setHours, setMinutes, startOfDay, startOfWeek } from 'date-fns';

import { DIMENSION_BY_KEY } from '@/constants/dimensions';
import { env } from '@/lib/env';
import { SYSTEM_THEMES } from '@/constants/themes';
import type { Activity, AuthUser, Profile, Theme } from '@/types/domain';

export type DemoActivityShare = { id: string; activity_id: string; shared_with_id: string; status: 'pending' | 'accepted' | 'declined'; created_at: string };
export type DemoReminder = { id: string; activity_id: string; offset_minutes: number; created_by: string; created_at: string };
export type DemoRecipient = { id: string; reminder_id: string; user_id: string; enabled: boolean };

export type DemoAccount = { user: AuthUser; password: string; profile: Profile };

type Listener = (user: AuthUser | null) => void;

type DemoState = {
  accounts: DemoAccount[];
  currentUser: AuthUser | null;
  themes: Theme[];
  activities: Activity[];
  activityShares: DemoActivityShare[];
  reminders: DemoReminder[];
  recipients: DemoRecipient[];
  listeners: Set<Listener>;
  /** Suscriptores a cambios de datos (simula Realtime). */
  dataListeners: Set<() => void>;
};

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const DEMO_USER: AuthUser = { id: 'demo-user', email: 'demo@kavi.app' };

const DEMO_PROFILE: Profile = {
  id: DEMO_USER.id,
  username: 'demo',
  display_name: 'Demo KAVI',
  avatar_url: null,
  created_at: new Date().toISOString(),
};

function themeByName(name: string): Theme {
  const theme = SYSTEM_THEMES.find((t) => t.name === name);
  if (!theme) throw new Error(`Tema demo no encontrado: ${name}`);
  return theme;
}

function activity(
  title: string,
  themeName: string | null,
  day: Date,
  hour: number,
  durationHours: number,
  extra: Partial<Activity> = {},
): Activity {
  const start = setMinutes(setHours(startOfDay(day), hour), 0);
  const end = addHours(start, durationHours);
  const theme = themeName ? themeByName(themeName) : null;
  const now = new Date().toISOString();
  return {
    id: nextId('act'),
    owner_id: DEMO_USER.id,
    title,
    description: null,
    theme_id: theme?.id ?? null,
    dimension: theme?.dimension ?? null,
    color: theme ? DIMENSION_BY_KEY[theme.dimension].color : null,
    icon: theme?.icon ?? null,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    all_day: false,
    recurrence_rule: null,
    recurrence_parent_id: null,
    is_gym: theme?.id === 'sys-gimnasio',
    created_at: now,
    updated_at: now,
    ...extra,
  };
}

/** Una semana realista alrededor de hoy para poblar el calendario. */
function seedActivities(): Activity[] {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const d = (offset: number) => addDays(monday, offset);
  return [
    activity('Gimnasio · pierna', 'Gimnasio', d(0), 7, 1.5),
    activity('Trabajo', 'Trabajo', d(0), 9, 8),
    activity('Lectura antes de dormir', 'Lectura', d(0), 21, 1),
    activity('Junta de equipo', 'Junta/Reunión', d(1), 10, 1),
    activity('Estudio · álgebra', 'Estudio', d(1), 17, 2),
    activity('Meditación', 'Meditación', d(2), 6, 0.5),
    activity('Gimnasio · empuje', 'Gimnasio', d(2), 7, 1.5),
    activity('Cena con amigos', 'Amigos', d(2), 20, 2),
    activity('Pagar servicios', 'Finanzas/Pagos', d(3), 12, 0.5),
    activity('Terapia', 'Journaling/Terapia', d(3), 18, 1),
    activity('Gimnasio · tirón', 'Gimnasio', d(4), 7, 1.5),
    activity('Proyecto KAVI', 'Proyecto personal', d(4), 16, 3),
    activity('Comida familiar', 'Familia', d(5), 14, 3),
    activity('Caminata en el parque', 'Caminata/Correr', d(6), 9, 1),
    activity('Descanso', 'Descanso', d(6), 0, 24, { all_day: true }),
    activity('Sin tema todavía', null, d(1), 13, 1),
    activity('Dentista', 'Cita médica', addDays(monday, 9), 11, 1),
    activity('Presupuesto del mes', 'Presupuesto', addDays(monday, -3), 19, 1),
  ];
}

export const demoState: DemoState = {
  accounts: [{ user: DEMO_USER, password: 'demo1234', profile: DEMO_PROFILE }],
  currentUser: env.demoAutologin ? DEMO_USER : null,
  themes: [...SYSTEM_THEMES],
  activities: seedActivities(),
  activityShares: [],
  reminders: [],
  recipients: [],
  listeners: new Set(),
  dataListeners: new Set(),
};

/** Notifica a la app que los datos cambiaron (invalidación de cache, como haría Realtime). */
export function emitDataChange() {
  demoState.dataListeners.forEach((listener) => listener());
}

export function subscribeDataChanges(listener: () => void): () => void {
  demoState.dataListeners.add(listener);
  return () => {
    demoState.dataListeners.delete(listener);
  };
}

export function setCurrentUser(user: AuthUser | null) {
  demoState.currentUser = user;
  demoState.listeners.forEach((listener) => listener(user));
}

/** Pequeña latencia para que los estados de carga sean visibles al desarrollar. */
export function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
