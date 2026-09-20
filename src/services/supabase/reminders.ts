import { addDays } from 'date-fns';

import { formatTime, fromIso } from '@/lib/dates';
import { getSupabase } from '@/lib/supabase';
import type { RemindersApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type { Reminder, UpcomingReminder } from '@/types/domain';

type ReminderRow = {
  id: string;
  activity_id: string;
  offset_minutes: number;
  created_by: string;
  created_at: string;
  recipients: { user_id: string; enabled: boolean }[];
};

function toReminder(row: ReminderRow, userId: string): Reminder {
  const { recipients, ...reminder } = row;
  return { ...reminder, enabled: recipients.find((r) => r.user_id === userId)?.enabled ?? true };
}

/** La RLS de reminder_recipients solo devuelve mi fila, así que el embed ya viene filtrado. */
const SELECT = '*, recipients:reminder_recipients(user_id,enabled)';

export const supabaseReminders: RemindersApi = {
  async listByActivity(activityId, userId) {
    const rows = unwrap(
      await getSupabase()
        .from('reminders')
        .select(SELECT)
        .eq('activity_id', activityId)
        .order('offset_minutes'),
    ) as ReminderRow[];
    return rows.map((r) => toReminder(r, userId));
  },

  /** Reemplaza el conjunto de offsets. Solo el dueño: lo impone la RLS. */
  async setForActivity(activityId, userId, offsets) {
    const db = getSupabase();
    const current = unwrap(
      await db.from('reminders').select('id,offset_minutes').eq('activity_id', activityId),
    ) as { id: string; offset_minutes: number }[];

    const wanted = new Set(offsets);
    const obsolete = current.filter((r) => !wanted.has(r.offset_minutes)).map((r) => r.id);
    if (obsolete.length > 0) {
      const { error } = await db.from('reminders').delete().in('id', obsolete);
      if (error) throw toError(error);
    }

    const existing = new Set(current.map((r) => r.offset_minutes));
    const missing = [...wanted].filter((o) => !existing.has(o));
    if (missing.length > 0) {
      const { error } = await db.from('reminders').insert(
        missing.map((offset_minutes) => ({ activity_id: activityId, offset_minutes, created_by: userId })),
      );
      if (error) throw toError(error);
    }

    // El trigger de `reminders` ya crea las copias; esto cubre el caso de solo borrar.
    await db.rpc('add_reminder_recipients', { p_activity: activityId });
    return supabaseReminders.listByActivity(activityId, userId);
  },

  /** Silenciar mi copia sin tocar la de nadie más (RF-S12). */
  async setEnabled(reminderId, userId, enabled) {
    const { error } = await getSupabase()
      .from('reminder_recipients')
      .update({ enabled })
      .eq('reminder_id', reminderId)
      .eq('user_id', userId);
    if (error) throw toError(error);
  },

  /** Lo que este dispositivo debe programar como notificación local (plan §3.4). */
  async listUpcoming(userId, horizonDays) {
    const now = new Date();
    const limit = addDays(now, horizonDays);
    const rows = unwrap(
      await getSupabase()
        .from('reminder_recipients')
        .select(
          'enabled, reminder:reminders!inner(id,offset_minutes,activity:activities!inner(id,title,start_at,all_day,owner_id,owner:profiles!activities_owner_id_fkey(display_name,username)))',
        )
        .eq('user_id', userId)
        .eq('enabled', true)
        .gte('reminder.activity.start_at', now.toISOString())
        .lte('reminder.activity.start_at', limit.toISOString()),
      // justificación: sin cliente tipado, supabase-js infiere los embeds como arreglo;
      // `reminder` y `activity` son relaciones a-uno y en ejecución llegan como objeto.
    ) as unknown as {
      reminder: {
        id: string;
        offset_minutes: number;
        activity: {
          id: string;
          title: string;
          start_at: string;
          all_day: boolean;
          owner_id: string;
          owner: { display_name: string | null; username: string } | null;
        };
      };
    }[];

    const upcoming: UpcomingReminder[] = rows.map(({ reminder }) => {
      const { activity } = reminder;
      const start = fromIso(activity.start_at);
      const sharedBy =
        activity.owner_id !== userId
          ? ` · Compartida por ${activity.owner?.display_name ?? activity.owner?.username ?? 'un contacto'}`
          : '';
      return {
        reminderId: reminder.id,
        activityId: activity.id,
        title: activity.title,
        body: `${activity.all_day ? 'Hoy' : `Empieza a las ${formatTime(start)}`}${sharedBy}`,
        fireAt: new Date(start.getTime() - reminder.offset_minutes * 60_000).toISOString(),
        activityStartAt: activity.start_at,
      };
    });
    return upcoming.sort((a, b) => a.fireAt.localeCompare(b.fireAt));
  },
};
