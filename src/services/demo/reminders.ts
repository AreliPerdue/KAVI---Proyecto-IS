import { addDays } from 'date-fns';

import { AuthUiError } from '@/lib/auth-errors';
import { formatTime, fromIso } from '@/lib/dates';
import type { RemindersApi } from '@/services/contracts';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import type { Reminder, UpcomingReminder } from '@/types/domain';

function toReminder(r: (typeof demoState.reminders)[number], userId: string): Reminder {
  const recipient = demoState.recipients.find((x) => x.reminder_id === r.id && x.user_id === userId);
  return { ...r, enabled: recipient?.enabled ?? true };
}

/** Destinatarios de un reminder: dueño + invitados con share aceptado (RF-S10). */
export function recipientsForActivity(activityId: string): string[] {
  const activity = demoState.activities.find((a) => a.id === activityId);
  if (!activity) return [];
  const accepted = demoState.activityShares
    .filter((s) => s.activity_id === activityId && s.status === 'accepted')
    .map((s) => s.shared_with_id);
  return [activity.owner_id, ...accepted];
}

/** Mantiene reminder_recipients sincronizado (equivalente a la RPC add_reminder_recipients). */
export function syncRecipients(activityId: string) {
  const users = recipientsForActivity(activityId);
  for (const reminder of demoState.reminders.filter((r) => r.activity_id === activityId)) {
    for (const userId of users) {
      if (!demoState.recipients.some((x) => x.reminder_id === reminder.id && x.user_id === userId)) {
        demoState.recipients.push({ id: nextId('rr'), reminder_id: reminder.id, user_id: userId, enabled: true });
      }
    }
  }
}

export function removeRemindersForActivities(activityIds: string[]) {
  const ids = new Set(activityIds);
  const reminderIds = new Set(demoState.reminders.filter((r) => ids.has(r.activity_id)).map((r) => r.id));
  demoState.reminders = demoState.reminders.filter((r) => !ids.has(r.activity_id));
  demoState.recipients = demoState.recipients.filter((x) => !reminderIds.has(x.reminder_id));
}

export const demoReminders: RemindersApi = {
  async listByActivity(activityId, userId) {
    await delay(80);
    return demoState.reminders
      .filter((r) => r.activity_id === activityId)
      .sort((a, b) => a.offset_minutes - b.offset_minutes)
      .map((r) => toReminder(r, userId));
  },

  async setForActivity(activityId, userId, offsets) {
    await delay(120);
    const activity = demoState.activities.find((a) => a.id === activityId);
    if (!activity) throw new AuthUiError('Esta actividad ya no existe.');
    if (activity.owner_id !== userId) throw new AuthUiError('Solo quien creó la actividad puede cambiar sus recordatorios.');
    const wanted = new Set(offsets);
    const current = demoState.reminders.filter((r) => r.activity_id === activityId);
    const toDelete = current.filter((r) => !wanted.has(r.offset_minutes)).map((r) => r.id);
    demoState.reminders = demoState.reminders.filter((r) => !toDelete.includes(r.id));
    demoState.recipients = demoState.recipients.filter((x) => !toDelete.includes(x.reminder_id));
    for (const offset of wanted) {
      if (!current.some((r) => r.offset_minutes === offset)) {
        demoState.reminders.push({ id: nextId('rem'), activity_id: activityId, offset_minutes: offset, created_by: userId, created_at: new Date().toISOString() });
      }
    }
    syncRecipients(activityId);
    emitDataChange();
    return demoReminders.listByActivity(activityId, userId);
  },

  async setEnabled(reminderId, userId, enabled) {
    await delay(80);
    const recipient = demoState.recipients.find((x) => x.reminder_id === reminderId && x.user_id === userId);
    if (recipient) recipient.enabled = enabled;
    else demoState.recipients.push({ id: nextId('rr'), reminder_id: reminderId, user_id: userId, enabled });
    emitDataChange();
  },

  async listUpcoming(userId, horizonDays) {
    await delay(60);
    const now = new Date();
    const limit = addDays(now, horizonDays);
    const result: UpcomingReminder[] = [];
    for (const recipient of demoState.recipients.filter((x) => x.user_id === userId && x.enabled)) {
      const reminder = demoState.reminders.find((r) => r.id === recipient.reminder_id);
      if (!reminder) continue;
      const activity = demoState.activities.find((a) => a.id === reminder.activity_id);
      if (!activity) continue;
      const start = fromIso(activity.start_at);
      if (start < now || start > limit) continue;
      const fireAt = new Date(start.getTime() - reminder.offset_minutes * 60_000);
      const owner = demoState.accounts.find((a) => a.user.id === activity.owner_id);
      const sharedBy = activity.owner_id !== userId ? ` · Compartida por ${owner?.profile.display_name ?? owner?.profile.username ?? 'un contacto'}` : '';
      result.push({
        reminderId: reminder.id,
        activityId: activity.id,
        title: activity.title,
        body: `${activity.all_day ? 'Hoy' : `Empieza a las ${formatTime(start)}`}${sharedBy}`,
        fireAt: fireAt.toISOString(),
        activityStartAt: activity.start_at,
      });
    }
    return result.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
  },
};
