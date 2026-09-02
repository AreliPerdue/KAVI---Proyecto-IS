import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useUserSearch(query: string) {
  const { userId } = useAuth();
  const normalized = query.trim().toLowerCase();
  return useQuery<Profile[]>({
    queryKey: connectionKeys.search(userId, normalized),
    queryFn: () => searchUsers(userId as string, normalized),
    enabled: !!userId && normalized.length >= 3,
  });
}

export function useConnectionMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: connectionKeys.all });
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
  };
}
