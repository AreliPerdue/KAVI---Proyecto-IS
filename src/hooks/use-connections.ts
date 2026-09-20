import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { assignPeopleColors, SELF_COLOR } from '@/constants/people-colors';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { invalidateSharedData } from '@/lib/query-invalidation';
import { useAuth } from '@/providers';
import {
  acceptConnection,
  type CalendarVisibility,
  type Contact,
  listContacts,
  removeConnection,
  requestConnection,
  searchUsers,
  setCalendarVisibility,
  setContactColor,
} from '@/services/connections';
import type { Profile } from '@/types/domain';

export const connectionKeys = {
  all: ['connections'] as const,
  contacts: (userId: string | null) => ['connections', 'contacts', userId] as const,
  search: (userId: string | null, query: string) => ['connections', 'search', userId, query] as const,
};

export function useContacts() {
  const { userId } = useAuth();
  return useQuery<Contact[]>({
    queryKey: connectionKeys.contacts(userId),
    queryFn: () => listContacts(userId as string),
    enabled: !!userId,
  });
}

/**
 * Color de cada persona para el calendario superpuesto (RF-S15): el elegido a mano y,
 * para el resto, el primero libre de la paleta. Incluye `SELF_COLOR` bajo mi propio id.
 */
export function usePeopleColors(): Map<string, string> {
  const { userId } = useAuth();
  const contacts = useContacts();
  const data = contacts.data;
  return useMemo(() => {
    const accepted = (data ?? [])
      .filter((c) => c.kind === 'accepted')
      .map((c) => ({ userId: c.profile.id, color: c.color }));
    const colors = assignPeopleColors(accepted);
    if (userId) colors.set(userId, SELF_COLOR);
    return colors;
  }, [data, userId]);
}

/** Mínimo para buscar: es también el largo mínimo de un username (RF-A1). */
export const SEARCH_MIN_LENGTH = 3;

/**
 * Búsqueda de personas mientras se escribe (RF-S1).
 *
 * `useDebouncedValue` evita una petición por tecla y `keepPreviousData` deja en pantalla
 * los resultados anteriores mientras llegan los nuevos: sin eso la lista parpadea a vacío
 * en cada pulsación y la búsqueda se siente más lenta de lo que es.
 */
export function useUserSearch(query: string) {
  const { userId } = useAuth();
  const normalized = query.trim().toLowerCase();
  const debounced = useDebouncedValue(normalized);
  const term = debounced.replace(/^@+/, '');

  return useQuery<Profile[]>({
    queryKey: connectionKeys.search(userId, debounced),
    queryFn: () => searchUsers(userId as string, debounced),
    enabled: !!userId && term.length >= SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  });
}

export function useConnectionMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  // No basta con recargar la lista de contactos: aceptar, eliminar o cambiar la
  // visibilidad altera también el calendario, la disponibilidad y las invitaciones.
  const invalidate = () => invalidateSharedData(queryClient);
  const uid = () => userId as string;

  return {
    request: useMutation({ mutationFn: (addresseeId: string) => requestConnection(uid(), addresseeId), onSuccess: invalidate }),
    accept: useMutation({ mutationFn: (connectionId: string) => acceptConnection(uid(), connectionId), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (connectionId: string) => removeConnection(uid(), connectionId), onSuccess: invalidate }),
    setVisibility: useMutation({
      mutationFn: ({ contactUserId, visibility }: { contactUserId: string; visibility: CalendarVisibility | null }) =>
        setCalendarVisibility(uid(), contactUserId, visibility),
      onSuccess: invalidate,
    }),
    setColor: useMutation({
      mutationFn: ({ contactUserId, color }: { contactUserId: string; color: string | null }) =>
        setContactColor(uid(), contactUserId, color),
      onSuccess: invalidate,
    }),
  };
}
