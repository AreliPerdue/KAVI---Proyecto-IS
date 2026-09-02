import { useQuery } from '@tanstack/react-query';

import type { DateRange } from '@/lib/dates';
import { toIso } from '@/lib/dates';
import { useAuth } from '@/providers';
import { type AvailabilityBlock, getAvailability } from '@/services/availability';

export function useAvailability(userIds: string[], range: DateRange) {
  const { userId } = useAuth();
  const fromIso = toIso(range.from);
  const toIsoValue = toIso(range.to);
  const ids = [...userIds].sort();
  return useQuery<AvailabilityBlock[]>({
    queryKey: ['availability', userId, ids, fromIso, toIsoValue],
    queryFn: () => getAvailability(userId as string, ids, fromIso, toIsoValue),
    enabled: !!userId && ids.length > 0,
  });
}
