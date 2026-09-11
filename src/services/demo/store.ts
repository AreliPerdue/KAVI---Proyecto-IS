/**
 * Estado en memoria del modo demo. Se reinicia al recargar la app.
 * Sirve para desarrollar y probar el frontend sin backend.
 */
import { addDays, addHours, setHours, setMinutes, startOfDay, startOfWeek } from 'date-fns';

import { DIMENSION_BY_KEY } from '@/constants/dimensions';
import { env } from '@/lib/env';
import { SYSTEM_THEMES } from '@/constants/themes';
import type { Activity, AuthUser, Profile, Theme } from '@/types/domain';

export type DemoConnection = { id: string; requester_id: string; addressee_id: string; status: 'pending' | 'accepted'; created_at: string; responded_at: string | null };
export type DemoCalendarShare = { id: string; owner_id: string; shared_with_id: string; visibility: 'busy' | 'details'; created_at: string };
export type DemoActivityShare = { id: string; activity_id: string; shared_with_id: string; status: 'pending' | 'accepted' | 'declined'; created_at: string };
export type DemoReminder = { id: string; activity_id: string; offset_minutes: number; created_by: string; created_at: string };
export type DemoRecipient = { id: string; reminder_id: string; user_id: string; enabled: boolean };

export type DemoAccount = { user: AuthUser; password: string; profile: Profile };

type Listener = (user: AuthUser | null) => void;

/** Preferencia de color de `owner_id` sobre `contact_id` (RF-S15). */
type DemoContactColor = { owner_id: string; contact_id: string; color: string };

type DemoState = {
  accounts: DemoAccount[];
  currentUser: AuthUser | null;
  themes: Theme[];
  activities: Activity[];
  connections: DemoConnection[];
  calendarShares: DemoCalendarShare[];
  /** Color que cada persona asigna a sus contactos al superponer calendarios (RF-S15). */
  contactColors: DemoContactColor[];
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
  ownerId: string = DEMO_USER.id,
): Activity {
  const start = setMinutes(setHours(startOfDay(day), hour), 0);
  const end = addHours(start, durationHours);
  const theme = themeName ? themeByName(themeName) : null;
  const now = new Date().toISOString();
  return {
    id: nextId('act'),
    owner_id: ownerId,
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

/** Otras cuentas para probar el calendario compartido (misma contraseña: demo1234). */
export const DEMO_CONTACTS = {
  ana: { id: 'demo-ana', email: 'ana@kavi.app', username: 'ana', display_name: 'Ana Torres' },
  luis: { id: 'demo-luis', email: 'luis@kavi.app', username: 'luis', display_name: 'Luis Mena' },
  maria: { id: 'demo-maria', email: 'maria@kavi.app', username: 'maria_g', display_name: 'María García' },
  pedro: { id: 'demo-pedro', email: 'pedro@kavi.app', username: 'pedro', display_name: 'Pedro Ruiz' },
} as const;

function contactAccount(c: (typeof DEMO_CONTACTS)[keyof typeof DEMO_CONTACTS]): DemoAccount {
  return {
    user: { id: c.id, email: c.email },
    password: 'demo1234',
    profile: { id: c.id, username: c.username, display_name: c.display_name, avatar_url: null, created_at: new Date().toISOString() },
  };
}

function seedOtherActivities(): Activity[] {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const d = (offset: number) => addDays(monday, offset);
  const ana = DEMO_CONTACTS.ana.id;
  const luis = DEMO_CONTACTS.luis.id;
  const pedro = DEMO_CONTACTS.pedro.id;
  return [
    activity('Trabajo', 'Trabajo', d(0), 9, 8, {}, ana),
    activity('Yoga', 'Deporte', d(1), 7, 1, {}, ana),
    activity('Trabajo', 'Trabajo', d(1), 9, 8, {}, ana),
    activity('Clase de piano', 'Curso/Clase', d(2), 18, 1.5, {}, ana),
    activity('Trabajo', 'Trabajo', d(3), 9, 8, {}, ana),
    activity('Gimnasio juntos', 'Gimnasio', d(3), 19, 1.5, {}, ana),
    activity('Brunch', 'Amigos', d(6), 11, 2, {}, ana),
    activity('Guardia', 'Trabajo', d(2), 8, 12, {}, luis),
    activity('Fútbol', 'Deporte', d(5), 17, 2, {}, luis),
    activity('Standup', 'Trabajo', d(0), 10, 0.5, {}, pedro),
    activity('Comida con cliente', 'Trabajo', d(1), 14, 1.5, {}, pedro),
    activity('Terapia', 'Journaling/Terapia', d(3), 17, 1, {}, pedro),
    activity('Ciclismo', 'Deporte', d(5), 7, 2, {}, pedro),
  ];
}

const seededOthers = seedOtherActivities();
const gymTogether = seededOthers.find((a) => a.title === 'Gimnasio juntos') as Activity;
const brunch = seededOthers.find((a) => a.title === 'Brunch') as Activity;

export const demoState: DemoState = {
  accounts: [
    { user: DEMO_USER, password: 'demo1234', profile: DEMO_PROFILE },
    ...Object.values(DEMO_CONTACTS).map(contactAccount),
  ],
  currentUser: env.demoAutologin ? DEMO_USER : null,
  contactColors: [],
  themes: [...SYSTEM_THEMES],
  activities: [...seedActivities(), ...seededOthers],
  connections: [
    { id: 'con-ana', requester_id: DEMO_USER.id, addressee_id: DEMO_CONTACTS.ana.id, status: 'accepted', created_at: new Date().toISOString(), responded_at: new Date().toISOString() },
    { id: 'con-luis', requester_id: DEMO_CONTACTS.luis.id, addressee_id: DEMO_USER.id, status: 'pending', created_at: new Date().toISOString(), responded_at: null },
    { id: 'con-maria', requester_id: DEMO_USER.id, addressee_id: DEMO_CONTACTS.maria.id, status: 'pending', created_at: new Date().toISOString(), responded_at: null },
    { id: 'con-pedro', requester_id: DEMO_USER.id, addressee_id: DEMO_CONTACTS.pedro.id, status: 'accepted', created_at: new Date().toISOString(), responded_at: new Date().toISOString() },
  ],
  calendarShares: [
    { id: 'cs-ana', owner_id: DEMO_CONTACTS.ana.id, shared_with_id: DEMO_USER.id, visibility: 'busy', created_at: new Date().toISOString() },
    { id: 'cs-pedro', owner_id: DEMO_CONTACTS.pedro.id, shared_with_id: DEMO_USER.id, visibility: 'details', created_at: new Date().toISOString() },
  ],
  activityShares: [
    { id: 'as-gym', activity_id: gymTogether.id, shared_with_id: DEMO_USER.id, status: 'pending', created_at: new Date().toISOString() },
    { id: 'as-brunch', activity_id: brunch.id, shared_with_id: DEMO_USER.id, status: 'accepted', created_at: new Date().toISOString() },
  ],
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
