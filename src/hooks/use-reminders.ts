import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { REMINDER_HORIZON_DAYS } from '@/constants/reminders';
import { syncNotifications } from '@/lib/notifications';
import { useAuth } from '@/providers';
import { listRemindersByActivity, listUpcomingReminders, setReminderEnabled, setRemindersForActivity } from '@/services/reminders';
import type { Reminder, UpcomingReminder } from '@/types/domain';

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
export function useReminderSync() {
  const upcoming = useUpcomingReminders();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const lastSynced = useRef<string>('');

  useEffect(() => {
    if (!upcoming.data) return;
    const signature = JSON.stringify(upcoming.data.map((r) => [r.reminderId, r.fireAt]));
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    void syncNotifications(upcoming.data);
  }, [upcoming.data]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userId) {
        void queryClient.invalidateQueries({ queryKey: reminderKeys.upcoming(userId) });
      }
    });
    return () => sub.remove();
  }, [queryClient, userId]);
}
