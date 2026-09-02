import type { RemindersApi } from '@/services/contracts';
import { notImplemented } from '@/services/supabase/not-implemented';

/** Fase 8 (T031): reminders + reminder_recipients + RPC add_reminder_recipients. */
export const supabaseReminders: RemindersApi = {
  listByActivity: () => notImplemented('reminders.listByActivity'),
  setForActivity: () => notImplemented('reminders.setForActivity'),
  setEnabled: () => notImplemented('reminders.setEnabled'),
  listUpcoming: async () => [],
};
