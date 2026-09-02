import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { type CalendarView, type DateRange, rangeForView, shiftAnchor, toIso } from '@/lib/dates';
import { useAuth } from '@/providers';
import { listActivitiesByRange } from '@/services/activities';
import type { Activity } from '@/types/domain';

export const activityKeys = {
  all: ['activities'] as const,
  range: (userId: string | null, fromIso: string, toIso: string) =>
    ['activities', 'range', userId, fromIso, toIso] as const,
  detail: (id: string) => ['activities', 'detail', id] as const,
};

/** Actividades del rango [from, to) con cache por rango (NFR-1). */
export function useActivitiesRange(range: DateRange) {
  const { userId } = useAuth();
  const fromIso = toIso(range.from);
  const toIsoValue = toIso(range.to);
  return useQuery<Activity[]>({
    queryKey: activityKeys.range(userId, fromIso, toIsoValue),
    queryFn: () => listActivitiesByRange(userId as string, fromIso, toIsoValue),
    enabled: !!userId,
    placeholderData: (previous) => previous,
  });
}

/** Precarga el rango anterior y siguiente para navegar sin spinner (NFR-2). */
export function usePrefetchAdjacentRanges(view: CalendarView, anchor: Date) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    for (const direction of [1, -1] as const) {
      const range = rangeForView(view, shiftAnchor(view, anchor, direction));
      const fromIso = toIso(range.from);
      const toIsoValue = toIso(range.to);
      void queryClient.prefetchQuery({
        queryKey: activityKeys.range(userId, fromIso, toIsoValue),
        queryFn: () => listActivitiesByRange(userId, fromIso, toIsoValue),
      });
    }
  }, [userId, view, anchor, queryClient]);
}
