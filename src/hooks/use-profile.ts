import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import { getMyProfile, type ProfileUpdate, updateMyProfile } from '@/services/profiles';

export const profileKeys = {
  me: (userId: string | null) => ['profile', 'me', userId] as const,
};

export function useMyProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: profileKeys.me(userId),
    queryFn: () => getMyProfile(userId as string),
    enabled: !!userId,
  });
}

export function useUpdateMyProfile() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateMyProfile(userId as string, patch),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.me(userId), profile);
    },
  });
}
