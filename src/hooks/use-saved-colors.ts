import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import { getSavedColors, saveSavedColors } from '@/services/library';

const clave = (userId: string | null) => ['library', 'saved-colors', userId] as const;

/** "Mis colores" (13h, RF-CC12; T342): la paleta que la persona guarda, en su cuenta. */
export function useSavedColors() {
  const { userId } = useAuth();
  return useQuery({ queryKey: clave(userId), queryFn: () => getSavedColors(userId as string), enabled: !!userId });
}

/** Guarda la paleta completa; se ve al instante y, si falla, vuelve a la de antes. */
export function useSaveColors() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colores: string[]) => saveSavedColors(userId as string, colores),
    onMutate: (colores) => {
      const antes = queryClient.getQueryData<string[]>(clave(userId));
      queryClient.setQueryData(clave(userId), colores);
      return { antes };
    },
    onError: (_e, _c, ctx) => queryClient.setQueryData(clave(userId), ctx?.antes),
  });
}
