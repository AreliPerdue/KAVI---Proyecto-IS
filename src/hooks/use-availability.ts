import { useQuery } from '@tanstack/react-query';

import type { DateRange } from '@/lib/dates';
import { toIso } from '@/lib/dates';
import { useAuth } from '@/providers';
import { type AvailabilityBlock, getAvailability } from '@/services/availability';

export function useAvailability(userIds: string[], range: DateRange) {
  const { userId } = useAuth();
  const fromIso = toIso(range.from);
  const toIsoValue = toIso(range.to);
  // Orden fijo por punto de código: los ids forman parte de la clave de caché, así que
  // dos llamadas con los mismos contactos en distinto orden deben compartir resultado.
  // No se usa `localeCompare` a propósito: depende del idioma y haría la clave inestable.
  const ids = [...userIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return useQuery<AvailabilityBlock[]>({
    queryKey: ['availability', userId, ids, fromIso, toIsoValue],
    queryFn: () => getAvailability(userId as string, ids, fromIso, toIsoValue),
    enabled: !!userId && ids.length > 0,
  });
}
