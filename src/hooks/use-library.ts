import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import { LIBRARY_URL_SECONDS } from '@/constants/library';
import {
  addToShelf,
  clearCustomCover,
  createShelf,
  getLibraryItem,
  importLibraryBook,
  type ImportarLibro,
  libraryFileUrl,
  type LibraryItem,
  type LibraryItemPatch,
  type LibraryShelf,
  type LibraryShelfItem,
  libraryUsage,
  listLibraryItems,
  listShelfItems,
  listShelves,
  moveInShelf,
  removeFromShelf,
  removeLibraryItem,
  removeShelf,
  saveLibraryCover,
  setCustomCover,
  updateLibraryItem,
  updateShelf,
} from '@/services/library';

/** Claves de KAVI Library (spec 13): todo cuelga de `['library']`. */
export const libraryKeys = {
  all: ['library'] as const,
  items: (userId: string | null) => ['library', 'items', userId] as const,
  usage: (userId: string | null) => ['library', 'usage', userId] as const,
  url: (path: string | null) => ['library', 'url', path] as const,
  item: (id: string) => ['library', 'item', id] as const,
  shelves: (userId: string | null) => ['library', 'shelves', userId] as const,
  shelfItems: (userId: string | null) => ['library', 'shelf-items', userId] as const,
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

/** Cambiar los datos de una pieza (RF-BL16). Se ve al instante en la librería; si falla, se deshace. */
export function useUpdateLibraryItem() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LibraryItemPatch }) => updateLibraryItem(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: libraryKeys.items(userId) });
      const antes = queryClient.getQueryData<LibraryItem[]>(libraryKeys.items(userId));
      queryClient.setQueryData<LibraryItem[]>(libraryKeys.items(userId), (lista) => lista?.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      return { antes };
    },
    onError: (_e, _v, ctx) => queryClient.setQueryData(libraryKeys.items(userId), ctx?.antes),
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  });
}

/** Poner la misma categoría a varias piezas (RF-BL15). `null` las deja sin categoría. */
export function useSetLibraryCategory() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, category }: { ids: readonly string[]; category: string | null }) => {
      await Promise.all(ids.map((id) => updateLibraryItem(id, { category })));
    },
    onMutate: ({ ids, category }) => {
      queryClient.setQueryData<LibraryItem[]>(libraryKeys.items(userId), (lista) => lista?.map((i) => (ids.includes(i.id) ? { ...i, category } : i)));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  });
}

/**
 * Eliminar una o varias piezas con sus archivos, anotaciones y fichas (RF-BL15, RF-BL16). Desaparecen
 * de la librería de inmediato; si alguna no se pudo borrar, la librería vuelve a pedirse y reaparece.
 */
export function useRemoveLibraryItems() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: readonly string[]) => {
      // De a una: cada pieza borra su carpeta en R2 antes de su fila.
      for (const id of ids) await removeLibraryItem(id);
    },
    onMutate: (ids) => {
      queryClient.setQueryData<LibraryItem[]>(libraryKeys.items(userId), (lista) => lista?.filter((i) => !ids.includes(i.id)));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: libraryKeys.all }),
  });
}

/**
 * Portada propia (RF-BL23): poner una o volver a la original. Al terminar se vuelve a pedir todo lo de
 * la librería, incluida la dirección firmada de la portada, para que se vea la nueva imagen.
 */
export function useCustomCover() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const refrescar = () => queryClient.invalidateQueries({ queryKey: libraryKeys.all });
  const poner = useMutation({
    mutationFn: ({ item, jpeg, color }: { item: LibraryItem; jpeg: Uint8Array; color: string | null }) => setCustomCover(userId as string, item, jpeg, color),
    onSettled: refrescar,
  });
  const quitar = useMutation({
    mutationFn: (id: string) => clearCustomCover(id),
    onMutate: (id) => {
      queryClient.setQueryData<LibraryItem[]>(libraryKeys.items(userId), (lista) =>
        lista?.map((i) => (i.id === id ? { ...i, custom_cover_path: null, custom_cover_color: null } : i)),
      );
    },
    onSettled: refrescar,
  });
  return { poner, quitar };
}

/** Los libreros de la persona, en su orden (RF-BL5, RF-BL7). */
export function useShelves() {
  const { userId } = useAuth();
  return useQuery<LibraryShelf[]>({ queryKey: libraryKeys.shelves(userId), queryFn: () => listShelves(userId as string), enabled: !!userId });
}

/** Qué piezas hay en cada librero y en qué orden (RF-BL6). */
export function useShelfItems() {
  const { userId } = useAuth();
  return useQuery<LibraryShelfItem[]>({ queryKey: libraryKeys.shelfItems(userId), queryFn: () => listShelfItems(userId as string), enabled: !!userId });
}

type DatosLibrero = Pick<LibraryShelf, 'name'> & Partial<Pick<LibraryShelf, 'color' | 'icon'>>;

/**
 * Todo lo que cambia libreros (T280): crearlos, editarlos, reordenarlos y borrarlos, y poner, quitar o
 * mover piezas en ellos. Cada cambio se ve al instante y al terminar se vuelve a pedir lo de la base.
 */
export function useShelfMutations() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const claveLibreros = libraryKeys.shelves(userId);
  const claveEnLibreros = libraryKeys.shelfItems(userId);
  const refrescar = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: claveLibreros }), queryClient.invalidateQueries({ queryKey: claveEnLibreros })]);
  const cambiarEnLibreros = (f: (lista: LibraryShelfItem[]) => LibraryShelfItem[]) =>
    queryClient.setQueryData<LibraryShelfItem[]>(claveEnLibreros, (lista) => f(lista ?? []));

  return {
    crear: useMutation({ mutationFn: (datos: DatosLibrero) => createShelf(userId as string, datos), onSettled: refrescar }),
    editar: useMutation({
      mutationFn: ({ id, datos }: { id: string; datos: Partial<DatosLibrero> }) => updateShelf(id, datos),
      onMutate: ({ id, datos }) => queryClient.setQueryData<LibraryShelf[]>(claveLibreros, (l) => l?.map((s) => (s.id === id ? { ...s, ...datos } : s))),
      onSettled: refrescar,
    }),
    borrar: useMutation({
      mutationFn: (id: string) => removeShelf(id),
      onMutate: (id) => {
        queryClient.setQueryData<LibraryShelf[]>(claveLibreros, (l) => l?.filter((s) => s.id !== id));
        cambiarEnLibreros((l) => l.filter((s) => s.shelf_id !== id));
      },
      onSettled: refrescar,
    }),
    /** Los libreros en su nuevo orden, completo (de arrastrar en "Administrar libreros"). */
    reordenar: useMutation({
      mutationFn: async (ids: readonly string[]) => {
        await Promise.all(ids.map((id, i) => updateShelf(id, { sort_order: (i + 1) * 1024 })));
      },
      onMutate: (ids) =>
        queryClient.setQueryData<LibraryShelf[]>(claveLibreros, (l) =>
          l ? ids.map((id, i) => ({ ...(l.find((s) => s.id === id) as LibraryShelf), sort_order: (i + 1) * 1024 })).filter((s) => s.id) : l,
        ),
      onSettled: refrescar,
    }),
    /** Poner piezas en un librero; las que ya estaban se quedan donde estaban (RF-BL6). */
    agregar: useMutation({
      mutationFn: async ({ shelfId, itemIds }: { shelfId: string; itemIds: readonly string[] }) => {
        for (const id of itemIds) await addToShelf(userId as string, shelfId, id);
      },
      onMutate: ({ shelfId, itemIds }) =>
        cambiarEnLibreros((l) => {
          let ultimo = l.filter((s) => s.shelf_id === shelfId).reduce((m, s) => Math.max(m, Number(s.sort_order)), 0);
          const nuevos = itemIds
            .filter((id) => !l.some((s) => s.shelf_id === shelfId && s.item_id === id))
            .map((id) => ({ shelf_id: shelfId, item_id: id, sort_order: (ultimo += 1024), added_at: new Date().toISOString() }));
          return [...l, ...nuevos];
        }),
      onSettled: refrescar,
    }),
    /** Sacar piezas de un librero; no se borran (RF-BL6). */
    quitar: useMutation({
      mutationFn: async ({ shelfId, itemIds }: { shelfId: string; itemIds: readonly string[] }) => {
        await Promise.all(itemIds.map((id) => removeFromShelf(shelfId, id)));
      },
      onMutate: ({ shelfId, itemIds }) => cambiarEnLibreros((l) => l.filter((s) => !(s.shelf_id === shelfId && itemIds.includes(s.item_id)))),
      onSettled: refrescar,
    }),
    /** Mover una pieza dentro de su librero (RF-BL7): solo cambia su orden. */
    mover: useMutation({
      mutationFn: ({ shelfId, itemId, orden }: { shelfId: string; itemId: string; orden: number }) => moveInShelf(shelfId, itemId, orden),
      onMutate: ({ shelfId, itemId, orden }) =>
        cambiarEnLibreros((l) => l.map((s) => (s.shelf_id === shelfId && s.item_id === itemId ? { ...s, sort_order: orden } : s))),
      onSettled: refrescar,
    }),
  };
}
