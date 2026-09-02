import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { activityKeys } from '@/hooks/use-activities-range';
import { useAuth } from '@/providers';
import { createActivity, type CreateActivityInput, getActivity, type RecurrenceScope, removeActivity, updateActivity } from '@/services/activities';
import type { Activity } from '@/types/domain';

export function useActivity(id: string | undefined) {
  return useQuery<Activity>({
    queryKey: activityKeys.detail(id ?? ''),
    queryFn: () => getActivity(id as string),
    enabled: !!id,
  });
}

export function useActivityMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: activityKeys.all });

  const create = useMutation({
    mutationFn: (input: CreateActivityInput) => createActivity(userId as string, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch, scope }: { id: string; patch: Partial<CreateActivityInput>; scope?: RecurrenceScope }) =>
      updateActivity(id, patch, scope),
    onSuccess: (activity) => {
      queryClient.setQueryData(activityKeys.detail(activity.id), activity);
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: ({ id, scope }: { id: string; scope?: RecurrenceScope }) => removeActivity(id, scope),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
