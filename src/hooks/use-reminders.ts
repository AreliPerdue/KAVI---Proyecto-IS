import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import { REMINDER_HORIZON_DAYS } from '@/constants/reminders';
import { useListItemsByDate, useLists } from '@/hooks/use-lists';
import { toDayKey } from '@/lib/dates';
import { type ScheduledReminder, syncNotifications } from '@/lib/notifications';
import { useAuth } from '@/providers';
import { listRemindersByActivity, listUpcomingReminders, setReminderEnabled, setRemindersForActivity } from '@/services/reminders';
import type { KaviList, ListItem, Reminder, UpcomingReminder } from '@/types/domain';

export const reminderKeys = {
  all: ['reminders'] as const,
  byActivity: (activityId: string, userId: string | null) => ['reminders', 'activity', activityId, userId] as const,
  upcoming: (userId: string | null) => ['reminders', 'upcoming', userId] as const,
};

export function useActivityReminders(activityId: string | undefined) {
  const { userId } = useAuth();
  return useQuery<Reminder[]>({
    queryKey: reminderKeys.byActivity(activityId ?? '', userId),
    queryFn: () => listRemindersByActivity(activityId as string, userId as string),
    enabled: !!activityId && !!userId,
  });
}

export function useReminderMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: reminderKeys.all });

  const setForActivity = useMutation({
    mutationFn: ({ activityId, offsets }: { activityId: string; offsets: number[] }) =>
      setRemindersForActivity(activityId, userId as string, offsets),
    onSuccess: invalidate,
  });

  const setEnabled = useMutation({
    mutationFn: ({ reminderId, enabled }: { reminderId: string; enabled: boolean }) =>
      setReminderEnabled(reminderId, userId as string, enabled),
    onSuccess: invalidate,
  });

  return { setForActivity, setEnabled };
}

export function useUpcomingReminders() {
  const { userId } = useAuth();
  return useQuery<UpcomingReminder[]>({
    queryKey: reminderKeys.upcoming(userId),
    queryFn: () => listUpcomingReminders(userId as string, REMINDER_HORIZON_DAYS),
    enabled: !!userId,
  });
}

/**
 * Mantiene las notificaciones locales alineadas con los reminders (RF-C10, plan §3.4):
 * al login, al volver a primer plano y cada vez que cambian los reminders (cache).
 */
/**
 * Elementos de lista con día **y hora** dentro del horizonte, como avisos ya resueltos.
 *
 * Solo los que tienen hora: una fecha sin hora significa "ese día, cuando pueda", y
 * inventarle las 9 de la mañana sería ponerle a la persona una alarma que nunca pidió.
 */
function avisosDeListas(items: readonly ListItem[], listas: readonly KaviList[]): ScheduledReminder[] {
  const nombre = new Map(listas.map((l) => [l.id, l.name]));
  return items
    .filter((i) => i.completed_at === null && i.due_date !== null && i.due_time !== null)
    .map((i) => ({
      id: `list-item:${i.id}`,
      title: i.title,
      body: nombre.get(i.list_id) ?? 'Pendiente',
      // La hora es local, como la escribió quien la puso: la fecha es flotante (RF-L11).
      fireAt: new Date(`${i.due_date}T${(i.due_time as string).slice(0, 5)}:00`).toISOString(),
      data: { listId: i.list_id, listItemId: i.id },
    }));
}

export function useReminderSync() {
  const upcoming = useUpcomingReminders();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const lastSynced = useRef<string>('');

  const hoy = toDayKey(new Date());
  const hasta = toDayKey(addDays(new Date(), REMINDER_HORIZON_DAYS));
  const itemsConFecha = useListItemsByDate(hoy, hasta);
  const listas = useLists();

  /*
   * Actividades y elementos de lista se programan **juntos**: `syncNotifications` cancela
   * todo antes de reprogramar, así que llamarla por fuente borraría lo de la anterior.
   */
  const avisos = useMemo<ScheduledReminder[]>(() => {
    const deActividades = (upcoming.data ?? []).map((r) => ({
      id: r.reminderId,
      title: r.title,
      body: r.body,
      fireAt: r.fireAt,
      data: { activityId: r.activityId },
    }));
    return [...deActividades, ...avisosDeListas(itemsConFecha.data ?? [], listas.data ?? [])];
  }, [upcoming.data, itemsConFecha.data, listas.data]);

  useEffect(() => {
    if (!upcoming.data) return;
    const signature = JSON.stringify(avisos.map((r) => [r.id, r.fireAt]));
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    void syncNotifications(avisos);
  }, [avisos, upcoming.data]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId) {
        void queryClient.invalidateQueries({ queryKey: reminderKeys.upcoming(userId) });
      }
    });
    return () => sub.remove();
  }, [queryClient, userId]);
}
