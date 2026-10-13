import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import { LIBRARY_URL_SECONDS } from '@/constants/library';
import {
  getLibraryItem,
  importLibraryBook,
  type ImportarLibro,
  libraryFileUrl,
  libraryUsage,
  listLibraryItems,
  type LibraryItem,
  type LibraryItemPatch,
  saveLibraryCover,
  updateLibraryItem,
} from '@/services/library';

/** Claves de KAVI Library (spec 13): todo cuelga de `['library']`. */
export const libraryKeys = {
  all: ['library'] as const,
  items: (userId: string | null) => ['library', 'items', userId] as const,
  usage: (userId: string | null) => ['library', 'usage', userId] as const,
  url: (path: string | null) => ['library', 'url', path] as const,
  item: (id: string) => ['library', 'item', id] as const,
};

/** Las piezas de la persona, de la más nueva a la más vieja. */
export function useLibraryItems() {
  const { userId } = useAuth();
  return useQuery<LibraryItem[]>({ queryKey: libraryKeys.items(userId), queryFn: () => listLibraryItems(userId as string), enabled: !!userId });
}

/** Cuánto espacio usa y su tope (decisión B2). */
export function useLibraryUsage() {
  const { userId } = useAuth();
  return useQuery({ queryKey: libraryKeys.usage(userId), queryFn: () => libraryUsage(userId as string), enabled: !!userId });
}

/**
 * Dirección temporal de un archivo privado (portada, libro). Se renueva cinco minutos antes de que
 * caduque, para que una portada en pantalla no se rompa.
 */
export function useLibraryFileUrl(path: string | null) {
  return useQuery({
    queryKey: libraryKeys.url(path),
    queryFn: () => libraryFileUrl(path as string),
    enabled: !!path,
    staleTime: (LIBRARY_URL_SECONDS - 300) * 1000,
    gcTime: (LIBRARY_URL_SECONDS - 300) * 1000,
  });
}

/** Guardar un libro importado (T278); al terminar, bien o mal, se refrescan la librería y el espacio. */
export function useImportBook() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: ImportarLibro) => importLibraryBook(userId as string, datos),
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  });
}

/** Una pieza. Arranca con la de la librería si ya está en memoria, para abrir el lector sin esperar. */
export function useLibraryItem(id: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useQuery<LibraryItem>({
    queryKey: libraryKeys.item(id),
    queryFn: () => getLibraryItem(id),
    enabled: !!userId && !!id,
    initialData: () => queryClient.getQueryData<LibraryItem[]>(libraryKeys.items(userId))?.find((i) => i.id === id),
  });
}

/**
 * Guardar dónde va la lectura (RF-BR9). Se refleja de inmediato en la librería —su avance cambia sin
 * recargar— y se manda a la base; no se vuelve a pedir la lista por cada página.
 */
export function useSaveReadingPosition() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Pick<LibraryItemPatch, 'last_position' | 'progress'> }) => updateLibraryItem(id, patch),
    onMutate: ({ id, patch }) => {
      queryClient.setQueryData<LibraryItem[]>(libraryKeys.items(userId), (lista) => lista?.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      queryClient.setQueryData<LibraryItem>(libraryKeys.item(id), (i) => (i ? { ...i, ...patch } : i));
    },
  });
}

/** Guardar la portada que dibujó el motor para un PDF (RF-BL12). */
export function useSaveCover() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, jpeg, color }: { id: string; jpeg: Uint8Array; color: string | null }) => saveLibraryCover(userId as string, id, jpeg, color),
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  });
}
