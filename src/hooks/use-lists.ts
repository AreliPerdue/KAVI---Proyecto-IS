import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/providers';
import {
  addListItem,
  addSection,
  createList,
  duplicateList,
  getList,
  type KaviList,
  type ListDetail,
  type ListInput,
  type ListItem,
  type ListItemInput,
  listArchivedLists,
  listItemsByDateRange,
  listLists,
  listOverdueItems,
  type ListSearchResults,
  removeList,
  removeListItem,
  reorderList,
  reorderListItem,
  listListShares,
  type ListPermission,
  type ListShare,
  listListRuns,
  type ListRun,
  listsSharedWithMe,
  listTags,
  type ListTag,
  createListTag,
  removeListTag,
  renameListTag,
  setListTag,
  setRunItem,
  syncListRuns,
  tagsOfList,
  rescheduleListItems,
  searchLists,
  shareList,
  unshareList,
  toggleListItem,
  updateList,
  updateListItem,
} from '@/services/lists';

export const listKeys = {
  all: ['lists'] as const,
  list: (userId: string | null) => ['lists', 'list', userId] as const,
  detail: (id: string) => ['lists', 'detail', id] as const,
  byDate: (userId: string | null, from: string, to: string) => ['lists', 'date', userId, from, to] as const,
  overdue: (userId: string | null, before: string) => ['lists', 'overdue', userId, before] as const,
  search: (userId: string | null, term: string) => ['lists', 'search', userId, term] as const,
  shares: (listId: string) => ['lists', 'shares', listId] as const,
  sharedWithMe: (userId: string | null) => ['lists', 'shared-with-me', userId] as const,
  tags: (userId: string | null) => ['lists', 'tags', userId] as const,
  tagsOf: (listId: string) => ['lists', 'tags-of', listId] as const,
  runs: (listId: string, hoy: string) => ['lists', 'runs', listId, hoy] as const,
  history: (listId: string) => ['lists', 'history', listId] as const,
};

export function useLists() {
  const { userId } = useAuth();
  return useQuery<KaviList[]>({
    queryKey: listKeys.list(userId),
    queryFn: () => listLists(userId as string),
    enabled: !!userId,
  });
}

/** Listas archivadas: fuera del inicio, pero recuperables (RF-L2). */
export function useArchivedLists(enabled = true) {
  const { userId } = useAuth();
  return useQuery<KaviList[]>({
    queryKey: [...listKeys.list(userId), 'archived'],
    queryFn: () => listArchivedLists(userId as string),
    enabled: !!userId && enabled,
  });
}

export function useList(id: string | undefined) {
  return useQuery<ListDetail>({
    queryKey: listKeys.detail(id ?? ''),
    queryFn: () => getList(id as string),
    enabled: !!id,
  });
}

/**
 * Ítems con fecha dentro del rango, para la franja de pendientes del día (RF-L12).
 * Las fechas van en `YYYY-MM-DD` porque son fechas flotantes, no instantes.
 */
export function useListItemsByDate(fromDate: string, toDate: string, enabled = true) {
  const { userId } = useAuth();
  return useQuery<ListItem[]>({
    queryKey: listKeys.byDate(userId, fromDate, toDate),
    queryFn: () => listItemsByDateRange(userId as string, fromDate, toDate),
    enabled: !!userId && enabled,
  });
}

/**
 * Pendientes vencidos: con fecha anterior a hoy y sin palomear (RF-L18).
 *
 * Se consultan aparte de los del día porque son otra cosa: no es "lo que toca hoy" sino
 * "lo que ya se te pasó", y en la franja se muestran con el acento de aviso y su fecha
 * original. Que no desaparezcan es justo el punto.
 */
export function useOverdueListItems(beforeDate: string, enabled = true) {
  const { userId } = useAuth();
  return useQuery<ListItem[]>({
    queryKey: listKeys.overdue(userId, beforeDate),
    queryFn: () => listOverdueItems(userId as string, beforeDate),
    enabled: !!userId && enabled,
  });
}

/**
 * Busca listas y elementos (RF-L4).
 *
 * Con menos de dos letras no consulta: un solo carácter trae media base y no acerca a nada.
 * `placeholderData` conserva lo anterior mientras llega lo nuevo, para que la lista no
 * parpadee a vacío entre pulsaciones.
 */
export function useListSearch(term: string) {
  const { userId } = useAuth();
  const limpio = term.trim();
  return useQuery<ListSearchResults>({
    queryKey: listKeys.search(userId, limpio),
    queryFn: () => searchLists(userId as string, limpio),
    enabled: !!userId && limpio.length >= 2,
    placeholderData: (previo) => previo,
  });
}

/** Con quién está compartida una lista (RF-L14). */
export function useListShares(listId: string | undefined) {
  return useQuery<ListShare[]>({
    queryKey: listKeys.shares(listId ?? ''),
    queryFn: () => listListShares(listId as string),
    enabled: !!listId,
  });
}

/** Listas que otras personas comparten conmigo (RF-L1). */
export function useListsSharedWithMe() {
  const { userId } = useAuth();
  return useQuery<KaviList[]>({
    queryKey: listKeys.sharedWithMe(userId),
    queryFn: () => listsSharedWithMe(userId as string),
    enabled: !!userId,
  });
}

/** Mis etiquetas, con cuántas listas lleva cada una (RF-L22). */
export function useListTags() {
  const { userId } = useAuth();
  return useQuery<ListTag[]>({
    queryKey: listKeys.tags(userId),
    queryFn: () => listTags(userId as string),
    enabled: !!userId,
  });
}

/** Etiquetas puestas a una lista concreta. */
export function useTagsOfList(listId: string | undefined) {
  const { userId } = useAuth();
  return useQuery<ListTag[]>({
    queryKey: listKeys.tagsOf(listId ?? ''),
    queryFn: () => tagsOfList(listId as string, userId as string),
    enabled: !!listId && !!userId,
  });
}

/**
 * Vueltas abiertas de una lista que se repite (RF-L20).
 *
 * La consulta **también escribe**: cierra lo caducado y abre la de hoy. Es deliberado — el
 * ciclo de vida de una vuelta depende de la hora, no de que alguien pulse algo, y pedirle a
 * la pantalla que lo orqueste sería darle una responsabilidad que no es suya. El día va en
 * la clave para que al cruzar la medianoche se vuelva a preguntar solo.
 */
export function useListRuns(listId: string | undefined, hoy: string, enabled = true) {
  return useQuery<ListRun[]>({
    queryKey: listKeys.runs(listId ?? '', hoy),
    queryFn: () => syncListRuns(listId as string, hoy),
    enabled: !!listId && enabled,
  });
}

/** Historial de vueltas ya cerradas, para los resúmenes (RF-L21). */
export function useListHistory(listId: string | undefined, enabled = true) {
  return useQuery<ListRun[]>({
    queryKey: listKeys.history(listId ?? ''),
    queryFn: () => listListRuns(listId as string),
    enabled: !!listId && enabled,
  });
}

export function useListMutations() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  // Todo lo de listas cuelga de la misma raíz: palomear un ítem cambia la cuenta de
  // pendientes de su tarjeta y puede cambiar la franja del día, así que no vale
  // invalidar solo el detalle.
  const invalidar = () => qc.invalidateQueries({ queryKey: listKeys.all });

  return {
    create: useMutation({
      mutationFn: (input: ListInput) => createList(userId as string, input),
      onSuccess: invalidar,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateList>[1] }) => updateList(id, patch),
      onSuccess: invalidar,
    }),
    remove: useMutation({ mutationFn: (id: string) => removeList(id), onSuccess: invalidar }),
    duplicate: useMutation({ mutationFn: (id: string) => duplicateList(id), onSuccess: invalidar }),
    addSection: useMutation({
      mutationFn: ({ listId, name }: { listId: string; name: string }) => addSection(listId, name),
      onSuccess: invalidar,
    }),
    addItem: useMutation({
      mutationFn: ({ listId, input }: { listId: string; input: ListItemInput }) =>
        addListItem(listId, userId as string, input),
      onSuccess: invalidar,
    }),
    updateItem: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<ListItemInput> }) => updateListItem(id, patch),
      onSuccess: invalidar,
    }),
    removeItem: useMutation({ mutationFn: (id: string) => removeListItem(id), onSuccess: invalidar }),
    reschedule: useMutation({
      mutationFn: ({ ids, dueDate }: { ids: readonly string[]; dueDate: string }) =>
        rescheduleListItems(ids, dueDate),
      onSuccess: invalidar,
    }),
    /**
     * Intercambia el orden de dos vecinos (RF-L3, RF-L7).
     *
     * Subir y bajar en vez de arrastrar: el arrastre funciona distinto en web que en
     * nativo y ninguna librería cubre bien las dos, así que va aparte y después. Con dos
     * vecinos basta permutar sus `sort_order`; el hueco fraccionario se necesitará cuando
     * llegue el arrastre, que sí inserta en medio.
     */
    swapItems: useMutation({
      mutationFn: async ({ a, b }: { a: ListItem; b: ListItem }) => {
        // Los dos órdenes se leen **antes** de escribir ninguno: si se lee el segundo
        // después del primer guardado, se lee el valor ya intercambiado.
        const [ordenA, ordenB] = [a.sort_order, b.sort_order];
        await reorderListItem(a.id, ordenB, a.section_id);
        await reorderListItem(b.id, ordenA, b.section_id);
      },
      onSuccess: invalidar,
    }),
    swapLists: useMutation({
      mutationFn: async ({ a, b }: { a: KaviList; b: KaviList }) => {
        const [ordenA, ordenB] = [a.sort_order, b.sort_order];
        await reorderList(a.id, ordenB);
        await reorderList(b.id, ordenA);
      },
      onSuccess: invalidar,
    }),
    share: useMutation({
      mutationFn: ({ listId, userId: con, permission }: { listId: string; userId: string; permission: ListPermission }) =>
        shareList(listId, con, permission),
      onSuccess: invalidar,
    }),
    unshare: useMutation({
      mutationFn: ({ listId, userId: con }: { listId: string; userId: string }) => unshareList(listId, con),
      onSuccess: invalidar,
    }),
    /**
     * Coloca un elemento en una posición y una sección concretas (RF-L7, RF-L8).
     *
     * Toma la sección además del orden porque arrastrar entre secciones es el caso normal:
     * mover "Leche" de Frutas a Lácteos es una sola acción, no un cambio de orden seguido
     * de un cambio de sección.
     */
    placeItem: useMutation({
      mutationFn: ({ id, sortOrder, sectionId }: { id: string; sortOrder: number; sectionId: string | null }) =>
        reorderListItem(id, sortOrder, sectionId),
      onSuccess: invalidar,
    }),

    /**
     * Coloca un elemento en otra posición dentro de su grupo (RF-L7).
     *
     * El orden nuevo es el **punto medio** entre los dos vecinos del destino, que es para lo
     * que `sort_order` es `numeric`: mover algo escribe una sola fila. Con enteros habría
     * que renumerar todo lo que queda debajo, y en una lista compartida dos personas
     * arrastrando a la vez se pisarían.
     */
    moveItem: useMutation({
      mutationFn: async ({ grupo, from, to }: { grupo: readonly ListItem[]; from: number; to: number }) => {
        const item = grupo[from];
        if (!item || from === to) return;
        const sin = grupo.filter((_, i) => i !== from);
        const antes = sin[to - 1];
        const despues = sin[to];
        const orden =
          antes && despues
            ? (antes.sort_order + despues.sort_order) / 2
            : antes
              ? antes.sort_order + 1024
              : despues
                ? despues.sort_order / 2
                : 1024;
        await reorderListItem(item.id, orden, item.section_id);
      },
      onSuccess: invalidar,
    }),
    createTag: useMutation({
      mutationFn: (name: string) => createListTag(userId as string, name),
      onSuccess: invalidar,
    }),
    renameTag: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) => renameListTag(id, name),
      onSuccess: invalidar,
    }),
    removeTag: useMutation({ mutationFn: (id: string) => removeListTag(id), onSuccess: invalidar }),
    setTag: useMutation({
      mutationFn: ({ listId, tagId, puesta }: { listId: string; tagId: string; puesta: boolean }) =>
        setListTag(listId, tagId, puesta),
      onSuccess: invalidar,
    }),
    /** Coloca una lista en otra posición de su grupo, con el orden medio entre vecinos. */
    moveList: useMutation({
      mutationFn: async ({ grupo, from, to }: { grupo: readonly KaviList[]; from: number; to: number }) => {
        const lista = grupo[from];
        if (!lista || from === to) return;
        const sin = grupo.filter((_, i) => i !== from);
        const antes = sin[to - 1];
        const despues = sin[to];
        const orden =
          antes && despues
            ? (antes.sort_order + despues.sort_order) / 2
            : antes
              ? antes.sort_order + 1024
              : despues
                ? despues.sort_order / 2
                : 1024;
        await reorderList(lista.id, orden);
      },
      onSuccess: invalidar,
    }),
    toggleRunItem: useMutation({
      mutationFn: ({ runId, itemId, done }: { runId: string; itemId: string; done: boolean }) =>
        setRunItem(runId, itemId, userId as string, done),
      onSuccess: invalidar,
    }),
    toggleItem: useMutation({
      mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleListItem(id, userId as string, done),
      onSuccess: invalidar,
    }),
  };
}
