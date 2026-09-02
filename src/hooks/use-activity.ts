import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { activityKeys } from '@/hooks/use-activities-range';
import { useAuth } from '@/providers';
import { createActivity, getActivity, removeActivity, updateActivity } from '@/services/activities';
import type { Activity, ActivityInput } from '@/types/domain';

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
    mutationFn: (input: ActivityInput) => createActivity(userId as string, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ActivityInput> }) =>
      updateActivity(id, patch),
    onSuccess: (activity) => {
      queryClient.setQueryData(activityKeys.detail(activity.id), activity);
      void invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeActivity(id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}
