/** Reminders propios y compartidos (RF-C9, RF-S10–S13). Fachada sobre el backend activo. */
import { remindersApi } from '@/services/backend';

export type { Reminder, UpcomingReminder } from '@/types/domain';

export const listRemindersByActivity = remindersApi.listByActivity;
export const setRemindersForActivity = remindersApi.setForActivity;
export const setReminderEnabled = remindersApi.setEnabled;
export const listUpcomingReminders = remindersApi.listUpcoming;
