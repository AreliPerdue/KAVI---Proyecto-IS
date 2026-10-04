/**
 * Notificaciones locales (RF-C10, RF-S17, plan §3.4).
 *
 * `expo-notifications` es un módulo nativo y se carga de forma perezosa: en web no
 * existe (ahí el aviso va dentro de la app, NFR-10), y en un binario nativo que se
 * compiló sin el módulo `load()` devuelve `null` en vez de romper el arranque. Eso
 * último no es teórico: el proyecto estuvo con las notificaciones retiradas porque
 * una versión incompatible con el SDK reventaba en Android.
 *
 * Dos usos:
 *
 * - `syncNotifications()` programa los recordatorios de actividades y de elementos de
 *   lista, que llegan ya normalizados a `ScheduledReminder`. Es idempotente:
 *   cancela todo lo programado y lo reconstruye, así no acumula duplicados.
 * - `presentNow()` muestra un aviso inmediato, para cuando llega una solicitud de
 *   contacto o una invitación a una actividad.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';


type NotificationsModule = typeof import('expo-notifications');

let module: NotificationsModule | null | undefined;
let handlerSet = false;

/**
 * Expo Go retiró las notificaciones en el SDK 53, y cargar el módulo ahí no falla en
 * silencio: lanza un error que se ve en la consola en cada arranque. Se comprueba
 * antes de intentarlo, para no ensuciar los registros con algo ya conocido.
 */
const EN_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function load(): NotificationsModule | null {
  if (Platform.OS === 'web' || EN_EXPO_GO) return null;
  if (module !== undefined) return module;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga perezosa de módulo nativo
    module = require('expo-notifications') as NotificationsModule;
  } catch {
    // Binario nativo sin el módulo: sin notificaciones hasta recompilar.
    module = null;
  }
  return module;
}

export function notificationsAvailable(): boolean {
  return load() !== null;
}

/**
 * Estado actual del permiso **sin pedirlo**, para mostrarlo en Perfil.
 * `null` = no aplica (web, o binario nativo sin el módulo compilado).
 */
export async function notificationPermissionGranted(): Promise<boolean | null> {
  const Notifications = load();
  if (!Notifications) return null;
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

/** Pide permiso la primera vez que hay un reminder (plan §1). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = load();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function ensureHandler(Notifications: NotificationsModule) {
  if (handlerSet) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

/**
 * Un aviso ya resuelto: cuándo suena y qué dice, sin importar de dónde salió.
 *
 * Existe porque `syncNotifications` **cancela todo** antes de reprogramar, así que las
 * fuentes no pueden llamarla por separado: la segunda borraría lo de la primera. Todas se
 * normalizan a esta forma y se sincronizan de una sola vez.
 */
export type ScheduledReminder = {
  id: string;
  title: string;
  body: string;
  fireAt: string;
  data?: Record<string, string>;
};

/** Reconstruye todas las notificaciones locales a partir de los avisos dados. */
export async function syncNotifications(items: readonly ScheduledReminder[]): Promise<number> {
  const Notifications = load();
  if (!Notifications) return 0;
  ensureHandler(Notifications);
  const granted = await ensureNotificationPermission();
  if (!granted) return 0;

  /*
   * Se cancela todo **menos** el aviso de fin de descanso del gym: lo programa otra parte
   * de la app, y reconstruir los recordatorios a media serie lo borraba.
   */
  const programadas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    programadas
      .filter((n) => n.identifier !== REST_NOTIFICATION_ID)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const now = Date.now();
  let scheduled = 0;
  for (const item of items) {
    const fireAt = new Date(item.fireAt);
    if (fireAt.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: { title: item.title, body: item.body, data: item.data ?? {} },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
    scheduled += 1;
  }
  return scheduled;
}

/**
 * Muestra un aviso inmediato (RF-S17).
 *
 * A diferencia de los recordatorios, esto no se programa: se dispara cuando la app
 * se entera de algo por Realtime. Por eso **solo llega si la app está abierta o
 * recién enviada a segundo plano**: sin un servidor que empuje la notificación, el
 * sistema operativo no puede despertarla. Para avisos con la app cerrada haría falta
 * push real, que está anotado en el plan de mejora.
 *
 * Devuelve `true` si el aviso llegó a mostrarse.
 */
export async function presentNow(title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  const Notifications = load();
  if (!Notifications) return false;
  ensureHandler(Notifications);
  const current = await Notifications.getPermissionsAsync();
  // No se pide permiso aquí: sería pedirlo por sorpresa, sin que la persona haya
  // hecho nada. El permiso se solicita al configurar el primer recordatorio.
  if (!current.granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {} },
    trigger: null, // null = ahora mismo
  });
  return true;
}

/** Identificador fijo del aviso de fin de descanso: siempre hay a lo más uno. */
export const REST_NOTIFICATION_ID = 'kavi-gym-rest';

/**
 * Programa el aviso de fin de descanso (spec 07 v2, RF-F34). Llega aunque la pantalla esté
 * bloqueada o la app en segundo plano, porque lo dispara el sistema a la hora fijada. En
 * web no hay notificaciones locales: el aviso va dentro de la app (P5, NFR-10).
 */
export async function scheduleRestEnd(fireAt: Date, title: string, body: string): Promise<boolean> {
  const Notifications = load();
  if (!Notifications) return false;
  ensureHandler(Notifications);
  const current = await Notifications.getPermissionsAsync();
  if (!current.granted) return false;
  await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID).catch(() => undefined);
  if (fireAt.getTime() <= Date.now()) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: REST_NOTIFICATION_ID,
    content: { title, body, data: { kind: 'gym-rest' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
  return true;
}

export async function cancelRestEnd(): Promise<void> {
  const Notifications = load();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID).catch(() => undefined);
}
