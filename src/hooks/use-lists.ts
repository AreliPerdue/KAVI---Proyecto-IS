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
  listItemsByDateRange,
  listLists,
  removeList,
  removeListItem,
  toggleListItem,
  updateList,
  updateListItem,
} from '@/services/lists';

export const listKeys = {
  all: ['lists'] as const,
  list: (userId: string | null) => ['lists', 'list', userId] as const,
  detail: (id: string) => ['lists', 'detail', id] as const,
  byDate: (userId: string | null, from: string, to: string) => ['lists', 'date', userId, from, to] as const,
};

export function useLists() {
  const { userId } = useAuth();
  return useQuery<KaviList[]>({
    queryKey: listKeys.list(userId),
    queryFn: () => listLists(userId as string),
    enabled: !!userId,
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
export function useListItemsByDate(fromDate: string, toDate: string) {
  const { userId } = useAuth();
  return useQuery<ListItem[]>({
    queryKey: listKeys.byDate(userId, fromDate, toDate),
    queryFn: () => listItemsByDateRange(userId as string, fromDate, toDate),
    enabled: !!userId,
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
    toggleItem: useMutation({
      mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleListItem(id, userId as string, done),
      onSuccess: invalidar,
    }),
  };
}
