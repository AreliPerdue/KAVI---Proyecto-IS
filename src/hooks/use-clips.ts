import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { LIBRARY_URL_SECONDS } from '@/constants/library';
import { base64ToBytes } from '@/lib/library/base64';
import { useAuth } from '@/providers';
import { createClip, libraryFileUrl, listClips, removeClip, updateClipNote } from '@/services/library';
import type { LibraryClip, NuevoFragmento } from '@/types/domain';

const claves = {
  todos: (userId: string | null) => ['library', 'clips', userId] as const,
  url: (path: string) => ['library', 'url', path] as const,
};

/** Los fragmentos de la persona (spec 13c, RF-BH21; T317), el más nuevo primero. */
export function useClips() {
  const { userId } = useAuth();
  return useQuery<LibraryClip[]>({ queryKey: claves.todos(userId), queryFn: () => listClips(userId as string), enabled: !!userId });
}

/** Guardar uno. El de imagen llega del lector como `data:image/jpeg;base64,…`. */
export function useCreateClip() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clip, dataUrl }: { clip: NuevoFragmento; dataUrl?: string }) =>
      createClip(userId as string, clip, dataUrl ? base64ToBytes(dataUrl.replace(/^data:image\/jpeg;base64,/, '')) : undefined),
    onSuccess: (fila) => queryClient.setQueryData<LibraryClip[]>(claves.todos(userId), (lista = []) => [fila, ...lista.filter((c) => c.id !== fila.id)]),
  });
}

export function useUpdateClipNote() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string | null }) => updateClipNote(userId as string, id, note),
    onSuccess: (fila) => queryClient.setQueryData<LibraryClip[]>(claves.todos(userId), (lista = []) => lista.map((c) => (c.id === fila.id ? fila : c))),
  });
}

export function useRemoveClip() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeClip(userId as string, id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: claves.todos(userId) }),
  });
}

/** La imagen de cada fragmento de imagen: su dirección firmada, renovada antes de que caduque. id → dirección. */
export function useClipImages(clips: readonly LibraryClip[] | undefined): ReadonlyMap<string, string> {
  const conImagen = (clips ?? []).filter((c): c is LibraryClip & { path: string } => !!c.path);
  const urls = useQueries({
    queries: conImagen.map((c) => ({
      queryKey: claves.url(c.path),
      queryFn: () => libraryFileUrl(c.path),
      staleTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      gcTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      retry: 1,
    })),
  });
  const clave = JSON.stringify(conImagen.flatMap((c, i) => (urls[i]?.data ? [[c.id, urls[i].data]] : [])));
  return useMemo(() => new Map(JSON.parse(clave) as [string, string][]), [clave]);
}
