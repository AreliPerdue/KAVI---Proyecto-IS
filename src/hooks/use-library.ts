import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import { libraryUsage, listLibraryItems, type LibraryItem } from '@/services/library';

/** Claves de KAVI Library (spec 13): todo cuelga de `['library']`. */
export const libraryKeys = {
  all: ['library'] as const,
  items: (userId: string | null) => ['library', 'items', userId] as const,
  usage: (userId: string | null) => ['library', 'usage', userId] as const,
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
