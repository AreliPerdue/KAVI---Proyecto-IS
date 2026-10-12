import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import { LIBRARY_URL_SECONDS } from '@/constants/library';
import { libraryFileUrl, libraryUsage, listLibraryItems, type LibraryItem } from '@/services/library';

/** Claves de KAVI Library (spec 13): todo cuelga de `['library']`. */
export const libraryKeys = {
  all: ['library'] as const,
  items: (userId: string | null) => ['library', 'items', userId] as const,
  usage: (userId: string | null) => ['library', 'usage', userId] as const,
  url: (path: string | null) => ['library', 'url', path] as const,
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
