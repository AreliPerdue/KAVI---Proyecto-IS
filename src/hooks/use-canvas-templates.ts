import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import { listCanvasTemplates, removeCanvasTemplate, saveCanvasTemplate } from '@/services/library';
import type { LibraryCanvasTemplate } from '@/types/domain';

const clave = (userId: string | null) => ['library', 'canvas-templates', userId] as const;

/** Mis plantillas del lienzo creativo (13h, RF-CC20; T344). */
export function useCanvasTemplates() {
  const { userId } = useAuth();
  return useQuery({ queryKey: clave(userId), queryFn: () => listCanvasTemplates(userId as string), enabled: !!userId });
}

export function useSaveCanvasTemplate() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plantilla: Pick<LibraryCanvasTemplate, 'name' | 'orientation' | 'doc'>) => saveCanvasTemplate(userId as string, plantilla),
    onSuccess: (nueva) => queryClient.setQueryData<LibraryCanvasTemplate[]>(clave(userId), (lista = []) => [nueva, ...lista]),
  });
}

export function useRemoveCanvasTemplate() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeCanvasTemplate(id),
    onMutate: (id) => queryClient.setQueryData<LibraryCanvasTemplate[]>(clave(userId), (lista = []) => lista.filter((p) => p.id !== id)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: clave(userId) }),
  });
}
