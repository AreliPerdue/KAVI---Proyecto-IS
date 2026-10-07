import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { uuidv4 } from '@/lib/gym/ids';

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
  type NewListItemInput,
  listArchivedLists,
  listItemsByDateRange,
  listLists,
  listOverdueItems,
  listUndatedItems,
  type ListSearchResults,
  removeList,
  removeListItem,
  reorderList,
  reorderListItem,
  listListShares,
  type ListPermission,
  type ListShare,
  listListRuns,
  listRunsByDateRange,
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
  undated: (userId: string | null) => ['lists', 'undated', userId] as const,
  search: (userId: string | null, term: string) => ['lists', 'search', userId, term] as const,
  shares: (listId: string) => ['lists', 'shares', listId] as const,
  sharedWithMe: (userId: string | null) => ['lists', 'shared-with-me', userId] as const,
  tags: (userId: string | null) => ['lists', 'tags', userId] as const,
  tagsOf: (listId: string) => ['lists', 'tags-of', listId] as const,
  runs: (listId: string, hoy: string) => ['lists', 'runs', listId, hoy] as const,
  runsByDate: (userId: string | null, from: string, to: string) => ['lists', 'runs-date', userId, from, to] as const,
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
 * Pendientes sin fecha, para la bandeja de Algún día (RF-L25).
 *
 * Solo se consulta cuando esa pestaña está a la vista: es la consulta más ancha del módulo
 * —todo lo que no tiene día— y no tiene por qué correr cada vez que se abre el inicio.
 */
export function useUndatedListItems(enabled = true) {
  const { userId } = useAuth();
  return useQuery<ListItem[]>({
    queryKey: listKeys.undated(userId),
    queryFn: () => listUndatedItems(userId as string),
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
/**
 * Vueltas de mis rutinas en un rango, para el avance que pinta el calendario (RF-L26).
 * Solo lectura: no abre la vuelta de hoy, eso pasa al entrar a la lista.
 */
export function useListRunsByDate(fromDate: string, toDate: string, enabled = true) {
  const { userId } = useAuth();
  return useQuery<ListRun[]>({
    queryKey: listKeys.runsByDate(userId, fromDate, toDate),
    queryFn: () => listRunsByDateRange(userId as string, fromDate, toDate),
    enabled: !!userId && enabled,
  });
}

export function useListHistory(listId: string | undefined, enabled = true) {
  return useQuery<ListRun[]>({
    queryKey: listKeys.history(listId ?? ''),
    queryFn: () => listListRuns(listId as string),
    enabled: !!listId && enabled,
  });
}

/**
 * Cambios optimistas a los elementos (T268, RF-L5).
 *
 * Antes cada toque esperaba al servidor y luego volvía a pedir **todas** las consultas de
 * listas antes de pintar nada; en el teléfono, agregar "leche" tardaba lo que tardaran tres
 * o cuatro viajes. Ahora el cambio se escribe primero en la caché —en el detalle y en
 * cualquier otra consulta que traiga ese elemento: la franja, Hoy, la búsqueda— y la
 * recarga va por detrás, cuando ya no queda ningún cambio en camino.
 */
const CLAVE_MUTACION = listKeys.all;

const esElemento = (x: unknown): x is ListItem =>
  !!x && typeof x === 'object' && 'list_id' in x && 'title' in x && 'completed_at' in x;

/** Aplica `cambio` a cada arreglo de elementos que haya en la caché de listas. */
function tocarElementos(qc: QueryClient, cambio: (items: ListItem[]) => ListItem[]) {
  qc.setQueriesData({ queryKey: listKeys.all }, (data: unknown) => {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.length > 0 && esElemento(data[0]) ? cambio(data as ListItem[]) : data;
    // El detalle de una lista y los resultados de búsqueda traen sus elementos en `items`.
    if ('items' in data && Array.isArray((data as { items: unknown }).items)) {
      return { ...data, items: cambio((data as { items: ListItem[] }).items) };
    }
    return data;
  });
}

const parchar = (qc: QueryClient, id: string, patch: Partial<ListItem>) =>
  tocarElementos(qc, (items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

/** Detiene las recargas en camino y guarda la caché para poder deshacer si el servidor falla. */
async function prepararOptimista(qc: QueryClient) {
  await qc.cancelQueries({ queryKey: listKeys.all });
  return qc.getQueriesData({ queryKey: listKeys.all });
}

type Instantanea = Awaited<ReturnType<typeof prepararOptimista>>;

function deshacer(qc: QueryClient, antes: Instantanea | undefined) {
  for (const [clave, datos] of antes ?? []) qc.setQueryData(clave, datos);
}

/**
 * Recarga lo de listas solo cuando termina el **último** cambio en camino: si se agregan tres
 * elementos seguidos, recargar tras el primero traería una lista sin los otros dos y se verían
 * desaparecer y volver.
 */
function recargarAlFinal(qc: QueryClient) {
  if (qc.isMutating({ mutationKey: CLAVE_MUTACION }) <= 1) void qc.invalidateQueries({ queryKey: listKeys.all });
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
    addItem: conIdYOrden(
      qc,
      useMutation({
        mutationKey: CLAVE_MUTACION,
        mutationFn: ({ listId, input }: { listId: string; input: NewListItemInput }) =>
          addListItem(listId, userId as string, input),
        onMutate: async ({ listId, input }) => {
          const antes = await prepararOptimista(qc);
          const t = new Date().toISOString();
          const nuevo: ListItem = {
            id: input.id as string, list_id: listId, section_id: input.section_id ?? null,
            title: input.title.trim(), note: input.note ?? null, sort_order: input.sort_order as number,
            completed_at: null, completed_by: null, created_by: userId as string,
            due_date: input.due_date ?? null, due_time: input.due_time ?? null,
            reminder_offset_minutes: input.reminder_offset_minutes ?? null, created_at: t, updated_at: t,
          };
          qc.setQueryData<ListDetail>(listKeys.detail(listId), (d) => (d ? { ...d, items: [...d.items, nuevo] } : d));
          return { antes };
        },
        onError: (_e, _v, ctx) => deshacer(qc, ctx?.antes),
        onSettled: () => recargarAlFinal(qc),
      }),
    ),
    updateItem: useMutation({
      mutationKey: CLAVE_MUTACION,
      mutationFn: ({ id, patch }: { id: string; patch: Partial<ListItemInput> }) => updateListItem(id, patch),
      onMutate: async ({ id, patch }) => {
        const antes = await prepararOptimista(qc);
        parchar(qc, id, patch.title !== undefined ? { ...patch, title: patch.title.trim() } : patch);
        return { antes };
      },
      onError: (_e, _v, ctx) => deshacer(qc, ctx?.antes),
      onSettled: () => recargarAlFinal(qc),
    }),
    removeItem: useMutation({
      mutationKey: CLAVE_MUTACION,
      mutationFn: (id: string) => removeListItem(id),
      onMutate: async (id) => {
        const antes = await prepararOptimista(qc);
        tocarElementos(qc, (items) => items.filter((i) => i.id !== id));
        return { antes };
      },
      onError: (_e, _v, ctx) => deshacer(qc, ctx?.antes),
      onSettled: () => recargarAlFinal(qc),
    }),
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
      mutationKey: CLAVE_MUTACION,
      onMutate: async ({ a, b }) => {
        const antes = await prepararOptimista(qc);
        parchar(qc, a.id, { sort_order: b.sort_order });
        parchar(qc, b.id, { sort_order: a.sort_order });
        return { antes };
      },
      onError: (_e, _v, ctx) => deshacer(qc, ctx?.antes),
      onSettled: () => recargarAlFinal(qc),
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
      // Sin esto, la fila soltada regresaba a su lugar hasta que contestaba el servidor.
      mutationKey: CLAVE_MUTACION,
      onMutate: async ({ id, sortOrder, sectionId }) => {
        const antes = await prepararOptimista(qc);
        parchar(qc, id, { sort_order: sortOrder, section_id: sectionId });
        return { antes };
      },
      onError: (_e, _v, ctx) => deshacer(qc, ctx?.antes),
      onSettled: () => recargarAlFinal(qc),
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
      mutationKey: CLAVE_MUTACION,
      mutationFn: ({ runId, itemId, done }: { runId: string; itemId: string; done: boolean }) =>
        setRunItem(runId, itemId, userId as string, done),
      onMutate: async ({ runId, itemId, done }) => {
        const antes = await prepararOptimista(qc);
        qc.setQueriesData<ListRun[]>({ queryKey: ['lists', 'runs'] }, (vueltas) =>
          vueltas?.map((r) => {
            if (r.id !== runId) return r;
            const sin = r.completed_item_ids.filter((x) => x !== itemId);
            const ids = done ? [...sin, itemId] : sin;
            return { ...r, completed_item_ids: ids, completed_count: ids.length };
          }),
        );
        return { antes };
      },
      onError: (_e, _v, ctx) => deshacer(qc, ctx?.antes),
      onSettled: () => recargarAlFinal(qc),
    }),
    toggleItem: useMutation({
      mutationKey: CLAVE_MUTACION,
      mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleListItem(id, userId as string, done),
      onMutate: async ({ id, done }) => {
        const antes = await prepararOptimista(qc);
        parchar(qc, id, { completed_at: done ? new Date().toISOString() : null, completed_by: done ? (userId as string) : null });
        return { antes };
      },
      onError: (_e, _v, ctx) => deshacer(qc, ctx?.antes),
      onSettled: () => recargarAlFinal(qc),
    }),
  };
}

/**
 * Completa el elemento nuevo con su id y su orden **antes** de mandarlo (T268): son los mismos
 * que se pintan al instante, así que la fila no cambia de identidad cuando contesta el
 * servidor, y el servidor no tiene que consultar el siguiente orden.
 */
function conIdYOrden<R extends { mutate: (v: { listId: string; input: NewListItemInput }, o?: never) => void; mutateAsync: (v: { listId: string; input: NewListItemInput }, o?: never) => Promise<ListItem> }>(
  qc: QueryClient,
  mutacion: R,
): R {
  const completar = (v: { listId: string; input: NewListItemInput }) => {
    const items = qc.getQueryData<ListDetail>(listKeys.detail(v.listId))?.items ?? [];
    const ultimo = items.reduce((m, i) => Math.max(m, i.sort_order), 0);
    return { listId: v.listId, input: { ...v.input, id: v.input.id ?? uuidv4(), sort_order: v.input.sort_order ?? ultimo + 1024 } };
  };
  return {
    ...mutacion,
    mutate: (v, o) => mutacion.mutate(completar(v), o),
    mutateAsync: (v, o) => mutacion.mutateAsync(completar(v), o),
  };
}
