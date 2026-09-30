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
  rescheduleListItems,
  searchLists,
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
    toggleItem: useMutation({
      mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleListItem(id, userId as string, done),
      onSuccess: invalidar,
    }),
  };
}
