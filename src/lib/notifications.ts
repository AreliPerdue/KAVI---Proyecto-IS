/**
 * Notificaciones locales (RF-C10, plan §3.4) — **DESHABILITADAS**.
 *
 * `expo-notifications` se retiró del proyecto: el módulo nativo rompía el arranque
 * en Android. Este archivo conserva la misma API para que reminders y Perfil sigan
 * funcionando; los reminders se guardan y se ven en la app, pero no se programa
 * ninguna notificación del sistema (NFR-10: el aviso in-app sigue disponible).
 *
 * Para reactivarlas: `npx expo install expo-notifications`, poner
 * `NOTIFICATIONS_ENABLED` en `true` y restaurar la implementación con
 * `Notifications.scheduleNotificationAsync` (ver historial de git).
 */
import type { UpcomingReminder } from '@/types/domain';

/** Interruptor único de la funcionalidad. Mientras sea `false`, todo es no-op. */
export const NOTIFICATIONS_ENABLED = false;

export function notificationsAvailable(): boolean {
  return NOTIFICATIONS_ENABLED;
}

/**
 * Estado actual del permiso **sin pedirlo**, para mostrarlo en Perfil.
 * `null` = no aplica (funcionalidad deshabilitada).
 */
export async function notificationPermissionGranted(): Promise<boolean | null> {
  return null;
}

/** Pide permiso la primera vez que hay un reminder (plan §1). */
export async function ensureNotificationPermission(): Promise<boolean> {
  return false;
}

/** Reconstruye todas las notificaciones locales a partir de la lista de reminders. */
export async function syncNotifications(_items: readonly UpcomingReminder[]): Promise<number> {
  return 0;
}
