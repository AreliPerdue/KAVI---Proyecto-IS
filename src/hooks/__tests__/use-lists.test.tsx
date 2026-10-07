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
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/lists', () => ({
  ...jest.requireActual('@/services/lists'),
  searchLists: (...a: unknown[]) => mockBuscar(...a),
  listItemsByDateRange: (...a: unknown[]) => mockPorFecha(...a),
  reorderListItem: (...a: unknown[]) => mockReordenar(...a),
  updateListItem: () => Promise.resolve(undefined),
}));

beforeEach(() => {
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
