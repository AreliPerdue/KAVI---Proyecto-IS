/**
 * Notificaciones locales (RF-C10, plan §3.4). expo-notifications se carga de forma
 * perezosa y solo en nativo; en web no hay notificaciones locales (NFR-10: banner in-app).
 * `syncNotifications()` es idempotente: cancela todo lo programado y reprograma.
 */
import { Platform } from 'react-native';

import type { UpcomingReminder } from '@/types/domain';

type NotificationsModule = typeof import('expo-notifications');

let module: NotificationsModule | null | undefined;
let handlerSet = false;

function load(): NotificationsModule | null {
  if (Platform.OS === 'web') return null;
  if (module !== undefined) return module;
  try {
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

/** Reconstruye todas las notificaciones locales a partir de la lista de reminders. */
export async function syncNotifications(items: readonly UpcomingReminder[]): Promise<number> {
  const Notifications = load();
  if (!Notifications) return 0;
  ensureHandler(Notifications);
  const granted = await ensureNotificationPermission();
  if (!granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const now = Date.now();
  let scheduled = 0;
  for (const item of items) {
    const fireAt = new Date(item.fireAt);
    if (fireAt.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: item.reminderId,
      content: { title: item.title, body: item.body, data: { activityId: item.activityId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
    scheduled += 1;
  }
  return scheduled;
}
