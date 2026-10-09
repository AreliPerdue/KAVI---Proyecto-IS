/**
 * Hooks de Listas: la búsqueda espera dos letras (T213) y los pendientes por fecha viajan como
 * día `YYYY-MM-DD`, no como instante (T201, T212).
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { listKeys, useListItemsByDate, useListMutations, useListSearch } from '@/hooks/use-lists';
import type { ListItem } from '@/types/domain';

const mockBuscar = jest.fn();
const mockPorFecha = jest.fn();
const mockReordenar = jest.fn();
const mockServ = { add: jest.fn(), update: jest.fn(), remove: jest.fn(), toggle: jest.fn(), run: jest.fn(), updateList: jest.fn(), removeList: jest.fn(), setTag: jest.fn() };
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/lists', () => ({
  ...jest.requireActual('@/services/lists'),
  searchLists: (...a: unknown[]) => mockBuscar(...a),
  listItemsByDateRange: (...a: unknown[]) => mockPorFecha(...a),
  reorderListItem: (...a: unknown[]) => mockReordenar(...a),
  updateListItem: (...a: unknown[]) => mockServ.update(...a),
  addListItem: (...a: unknown[]) => mockServ.add(...a),
  removeListItem: (...a: unknown[]) => mockServ.remove(...a),
  toggleListItem: (...a: unknown[]) => mockServ.toggle(...a),
  setRunItem: (...a: unknown[]) => mockServ.run(...a),
  updateList: (...a: unknown[]) => mockServ.updateList(...a),
  removeList: (...a: unknown[]) => mockServ.removeList(...a),
  setListTag: (...a: unknown[]) => mockServ.setTag(...a),
}));

beforeEach(() => {
  for (const f of Object.values(mockServ)) f.mockReset().mockResolvedValue(undefined);
  mockBuscar.mockReset().mockResolvedValue({ lists: [], items: [] });
  mockPorFecha.mockReset().mockResolvedValue([]);
});

describe('useListSearch', () => {
  it('con menos de dos letras no consulta', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListSearch(' q '), { wrapper: Wrapper });
    expect(mockBuscar).not.toHaveBeenCalled();
  });

  it('con dos o más, consulta con el texto recortado', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListSearch('  qu '), { wrapper: Wrapper });
    await waitFor(() => expect(mockBuscar).toHaveBeenCalledWith('u1', 'qu'));
  });
});

describe('useListItemsByDate', () => {
  it('pide el rango con días YYYY-MM-DD', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListItemsByDate('2026-10-05', '2026-10-11'), { wrapper: Wrapper });
    await waitFor(() => expect(mockPorFecha).toHaveBeenCalledWith('u1', '2026-10-05', '2026-10-11'));
  });

  it('apagado no consulta (vistas con rejilla de horas)', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useListItemsByDate('2026-10-05', '2026-10-11', false), { wrapper: Wrapper });
    expect(mockPorFecha).not.toHaveBeenCalled();
  });
});

describe('swapItems (RF-L7)', () => {
  it('lee los dos órdenes antes de escribir: cada uno queda con el del otro', async () => {
    mockReordenar.mockReset().mockResolvedValue(undefined);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useListMutations(), { wrapper: Wrapper });
    const a = { id: 'a', sort_order: 1024, section_id: 's1' } as ListItem;
    const b = { id: 'b', sort_order: 2048, section_id: 's1' } as ListItem;
    // Simula al servidor: el primer guardado cambia el objeto que se pasó (como lo haría un
    // caché ya actualizado). Si se leyera `a.sort_order` después, saldría el valor nuevo.
    mockReordenar.mockImplementationOnce(async (_id: string, orden: number) => { a.sort_order = orden; });
    await act(async () => { await result.current.swapItems.mutateAsync({ a, b }); });
    expect(mockReordenar.mock.calls).toEqual([['a', 2048, 's1'], ['b', 1024, 's1']]);
  });
});

describe('updateItem', () => {
  it('invalida los pendientes por fecha: la franja del día se vuelve a pedir', async () => {
    const { Wrapper, queryClient } = crearWrapper();
    const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useListMutations(), { wrapper: Wrapper });
    await act(async () => { await result.current.updateItem.mutateAsync({ id: 'i1', patch: { due_date: '2026-10-07' } }); });
    const clave = invalidar.mock.calls[0]?.[0]?.queryKey as readonly unknown[];
    // `['lists']` es prefijo de `listKeys.byDate(...)`.
    expect(listKeys.byDate('u1', '2026-10-07', '2026-10-07').slice(0, clave.length)).toEqual(clave);
  });
});

/**
 * Cambios optimistas (T268): se ven en la caché antes de que conteste el servidor, se deshacen
 * si falla y la recarga espera a que termine el último cambio en camino.
 */
describe('optimista (T268)', () => {
  const el = (id: string, over: Partial<ListItem> = {}) =>
    ({ id, list_id: 'l1', section_id: null, title: id, note: null, sort_order: 1024, completed_at: null, completed_by: null, due_date: null, due_time: null, ...over }) as ListItem;
  const DETALLE = listKeys.detail('l1');

  /** Una promesa que se resuelve (o rechaza) cuando la prueba dice. */
  const pendiente = () => {
    let resolver: (v?: unknown) => void = () => undefined;
    let rechazar: (e: unknown) => void = () => undefined;
    const p = new Promise((res, rej) => { resolver = res; rechazar = rej; });
    return { p, resolver, rechazar };
  };

  const montar = async () => {
    const { Wrapper, queryClient } = crearWrapper();
    queryClient.setQueryDefaults(['lists'], { gcTime: Infinity });
    queryClient.setQueryData(DETALLE, { list: { id: 'l1' }, sections: [], items: [el('a', { sort_order: 1024 }), el('b', { sort_order: 2048 })] });
    queryClient.setQueryData(listKeys.byDate('u1', '2026-10-07', '2026-10-07'), [el('a')]);
    const { result } = await renderHook(() => useListMutations(), { wrapper: Wrapper });
    const items = () => queryClient.getQueryData<{ items: ListItem[] }>(DETALLE)?.items ?? [];
    return { result, queryClient, items };
  };

  it('agregar se ve al instante, con el mismo id y orden que se mandan al servidor', async () => {
    const r = pendiente();
    mockServ.add.mockReturnValue(r.p);
    const { result, items } = await montar();
    await act(async () => { result.current.addItem.mutate({ listId: 'l1', input: { title: ' Leche ' } }); });
    const nuevo = items().at(-1)!;
    expect(nuevo).toEqual(expect.objectContaining({ title: 'Leche', list_id: 'l1', sort_order: 3072, completed_at: null }));
    const [, , input] = mockServ.add.mock.calls[0] as [string, string, { id: string; sort_order: number }];
    expect(input.id).toBe(nuevo.id);
    expect(input.sort_order).toBe(3072);
    await act(async () => { r.resolver(nuevo); });
  });

  it('si el servidor rechaza, el elemento se quita', async () => {
    const r = pendiente();
    mockServ.add.mockReturnValue(r.p);
    const { result, items } = await montar();
    await act(async () => { result.current.addItem.mutate({ listId: 'l1', input: { title: 'Leche' } }); });
    expect(items()).toHaveLength(3);
    await act(async () => { r.rechazar(new Error('sin red')); });
    await waitFor(() => expect(items()).toHaveLength(2));
  });

  it('la recarga espera al último de varios cambios seguidos', async () => {
    const r1 = pendiente();
    const r2 = pendiente();
    mockServ.add.mockReturnValueOnce(r1.p).mockReturnValueOnce(r2.p);
    const { result, queryClient } = await montar();
    const recargar = jest.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      result.current.addItem.mutate({ listId: 'l1', input: { title: 'Leche' } });
      result.current.addItem.mutate({ listId: 'l1', input: { title: 'Pan' } });
    });
    await act(async () => { r1.resolver({}); });
    expect(recargar).not.toHaveBeenCalled();
    await act(async () => { r2.resolver({}); });
    await waitFor(() => expect(recargar).toHaveBeenCalledTimes(1));
  });

  it('palomear marca el elemento en el detalle y en la franja del día al momento', async () => {
    const r = pendiente();
    mockServ.toggle.mockReturnValue(r.p);
    const { result, queryClient, items } = await montar();
    await act(async () => { result.current.toggleItem.mutate({ id: 'a', done: true }); });
    expect(items()[0]?.completed_at).not.toBeNull();
    expect(queryClient.getQueryData<ListItem[]>(listKeys.byDate('u1', '2026-10-07', '2026-10-07'))?.[0]?.completed_by).toBe('u1');
    await act(async () => { r.resolver({}); });
  });

  it('borrar, corregir el texto y soltar en otro lugar se ven al momento', async () => {
    const r = pendiente();
    mockServ.remove.mockReturnValue(r.p);
    mockServ.update.mockReturnValue(r.p);
    mockReordenar.mockReset().mockReturnValue(r.p);
    const { result, items } = await montar();
    await act(async () => { result.current.updateItem.mutate({ id: 'a', patch: { title: ' Leche ' } }); });
    expect(items()[0]?.title).toBe('Leche');
    await act(async () => { result.current.placeItem.mutate({ id: 'b', sortOrder: 512, sectionId: 's1' }); });
    expect(items().find((i) => i.id === 'b')).toEqual(expect.objectContaining({ sort_order: 512, section_id: 's1' }));
    await act(async () => { result.current.removeItem.mutate('a'); });
    expect(items().map((i) => i.id)).toEqual(['b']);
    await act(async () => { r.resolver({}); });
  });

  it('en una rutina, palomear cambia la vuelta al momento', async () => {
    const r = pendiente();
    mockServ.run.mockReturnValue(r.p);
    const { result, queryClient } = await montar();
    const clave = listKeys.runs('l1', '2026-10-07');
    queryClient.setQueryData(clave, [{ id: 'run1', list_id: 'l1', run_date: '2026-10-07', closed_at: null, completed_count: 0, total_count: 2, completed_item_ids: [] }]);
    await act(async () => { result.current.toggleRunItem.mutate({ runId: 'run1', itemId: 'a', done: true }); });
    expect(queryClient.getQueryData<{ completed_item_ids: string[]; completed_count: number }[]>(clave)?.[0]).toEqual(expect.objectContaining({ completed_item_ids: ['a'], completed_count: 1 }));
    await act(async () => { r.resolver({}); });
  });
});

describe('acciones en grupo (RF-L28)', () => {
  const lista = (id: string, over = {}) => ({ id, name: id, is_pinned: false, tag_ids: [] as string[], ...over });
  /** Promesas que el "servidor" deja pendientes y la prueba suelta al final (sin esto, Jest no termina). */
  const pendientes: (() => void)[] = [];
  const enCamino = () => new Promise<void>((r) => { pendientes.push(r); });
  afterEach(async () => { await act(async () => { pendientes.splice(0).forEach((r) => r()); }); });

  const montarInicio = async () => {
    const { Wrapper, queryClient } = crearWrapper();
    queryClient.setQueryDefaults(['lists'], { gcTime: Infinity });
    queryClient.setQueryData(listKeys.list('u1'), [lista('a'), lista('b'), lista('c', { tag_ids: ['t1'] })]);
    const { result } = await renderHook(() => useListMutations(), { wrapper: Wrapper });
    const inicio = () => queryClient.getQueryData<{ id: string; is_pinned: boolean; tag_ids: string[] }[]>(listKeys.list('u1')) ?? [];
    return { result, inicio };
  };

  it('fijar varias se ve al momento y llama al servidor por cada una', async () => {
    mockServ.updateList.mockImplementation(enCamino);
    const { result, inicio } = await montarInicio();
    await act(async () => { result.current.updateMany.mutate({ ids: ['a', 'c'], patch: { is_pinned: true } }); });
    expect(inicio().filter((l) => l.is_pinned).map((l) => l.id)).toEqual(['a', 'c']);
    expect(mockServ.updateList.mock.calls.map(([id]) => id)).toEqual(['a', 'c']);
  });

  it('archivar y eliminar varias las sacan del inicio; si falla, vuelven', async () => {
    mockServ.removeList.mockRejectedValue(new Error('sin red'));
    mockServ.updateList.mockImplementation(enCamino);
    const { result, inicio } = await montarInicio();
    await act(async () => { result.current.updateMany.mutate({ ids: ['b'], patch: { is_archived: true } }); });
    expect(inicio().map((l) => l.id)).toEqual(['a', 'c']);
    await act(async () => { await result.current.removeMany.mutateAsync(['a', 'c']).catch(() => undefined); });
    await waitFor(() => expect(inicio().map((l) => l.id)).toEqual(['a', 'c']));
  });

  it('etiquetar varias agrega o quita la etiqueta a todas', async () => {
    mockServ.setTag.mockImplementation(enCamino);
    const { result, inicio } = await montarInicio();
    await act(async () => { result.current.setTagMany.mutate({ ids: ['a', 'c'], tagId: 't1', puesta: true }); });
    expect(inicio().find((l) => l.id === 'a')?.tag_ids).toEqual(['t1']);
    expect(inicio().find((l) => l.id === 'c')?.tag_ids).toEqual(['t1']);
    await act(async () => { result.current.setTagMany.mutate({ ids: ['a', 'c'], tagId: 't1', puesta: false }); });
    expect(inicio().flatMap((l) => l.tag_ids)).toEqual([]);
  });
});
