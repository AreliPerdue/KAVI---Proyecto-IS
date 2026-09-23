import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DIMENSIONS, type Dimension } from '@/constants/dimensions';
import { activityKeys } from '@/hooks/use-activities-range';
import { useAuth } from '@/providers';
import { createTheme, listThemes, removeTheme, resetSystemThemes, updateTheme } from '@/services/themes';
import type { Theme, ThemeInput } from '@/types/domain';

export const themeKeys = {
  list: (userId: string | null) => ['themes', userId] as const,
};

export function useThemes() {
  const { userId } = useAuth();
  return useQuery<Theme[]>({
    queryKey: themeKeys.list(userId),
    queryFn: () => listThemes(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Temas agrupados por dimensión en el orden de spec 05. */
export function useThemesByDimension(themes: readonly Theme[] | undefined) {
  return useMemo(() => {
    const groups = new Map<Dimension, Theme[]>(DIMENSIONS.map((d) => [d.key, []]));
    for (const theme of themes ?? []) groups.get(theme.dimension)?.push(theme);
    return DIMENSIONS.map((d) => ({ dimension: d, themes: groups.get(d.key) ?? [] }));
  }, [themes]);
}

export function useThemeMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: themeKeys.list(userId) });
    void queryClient.invalidateQueries({ queryKey: activityKeys.all });
  };
  const create = useMutation({ mutationFn: (input: ThemeInput) => createTheme(userId as string, input), onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ThemeInput> }) => updateTheme(id, patch, userId as string),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => removeTheme(id), onSuccess: invalidate });
  const resetSystem = useMutation({ mutationFn: () => resetSystemThemes(userId as string), onSuccess: invalidate });
  return { create, update, remove, resetSystem };
}
