import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { activityKeys } from '@/hooks/use-activities-range';
import { reminderKeys } from '@/hooks/use-reminders';
import { useAuth } from '@/providers';
import type { ActivityShareResponse } from '@/services/contracts';
import { type ActivityInvitation, listActivityShares, listInvitations, removeActivityShare, respondInvitation, shareActivity } from '@/services/shares';

export const shareKeys = {
  all: ['shares'] as const,
  byActivity: (activityId: string) => ['shares', 'activity', activityId] as const,
  invitations: (userId: string | null) => ['shares', 'invitations', userId] as const,
};

export function useActivityShares(activityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: shareKeys.byActivity(activityId ?? ''),
    queryFn: () => listActivityShares(activityId as string),
    enabled: !!activityId && enabled,
  });
}

export function useInvitations() {
  const { userId } = useAuth();
  return useQuery<ActivityInvitation[]>({
    queryKey: shareKeys.invitations(userId),
    queryFn: () => listInvitations(userId as string),
    enabled: !!userId,
  });
}

export function useShareMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: shareKeys.all });
    void queryClient.invalidateQueries({ queryKey: activityKeys.all });
    void queryClient.invalidateQueries({ queryKey: reminderKeys.all });
  };
  const uid = () => userId as string;

  return {
    share: useMutation({
      mutationFn: ({ activityId, contactUserIds }: { activityId: string; contactUserIds: string[] }) =>
        shareActivity(uid(), activityId, contactUserIds),
      onSuccess: invalidate,
    }),
    respond: useMutation({
      mutationFn: ({ shareId, respuesta }: { shareId: string; respuesta: ActivityShareResponse }) =>
        respondInvitation(uid(), shareId, respuesta),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (shareId: string) => removeActivityShare(uid(), shareId), onSuccess: invalidate }),
  };
}
