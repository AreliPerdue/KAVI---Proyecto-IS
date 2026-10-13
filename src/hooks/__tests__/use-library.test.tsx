/**
 * Hooks de KAVI Library que cambian la librería (T279, T281): se ven al instante y, si algo falla,
 * la librería vuelve a pedirse.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import {
  libraryKeys,
  useLibraryItem,
  useLibraryItems,
  useRemoveLibraryItems,
  useSaveReadingPosition,
  useSetLibraryCategory,
  useShelfMutations,
  useUpdateLibraryItem,
} from '@/hooks/use-library';
import type { LibraryItem } from '@/types/domain';

const mockRemove = jest.fn();
const mockListar = jest.fn();
const mockUna = jest.fn();
const mockBorrarCopias = jest.fn();
jest.mock('@/lib/library/offline/copies', () => ({ borrarCopias: (ids: string[]) => mockBorrarCopias(ids) }));
const mockUpdate = jest.fn();
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
const mockAddToShelf = jest.fn(async (..._a: unknown[]) => undefined);
const mockRemoveFromShelf = jest.fn(async (..._a: unknown[]) => undefined);
const mockUpdateShelf = jest.fn(async (..._a: unknown[]) => ({}));
jest.mock('@/services/library', () => ({
  removeLibraryItem: (...a: unknown[]) => mockRemove(...a),
  listLibraryItems: (...a: unknown[]) => mockListar(...a),
  getLibraryItem: (...a: unknown[]) => mockUna(...a),
  updateLibraryItem: (...a: unknown[]) => mockUpdate(...a),
  addToShelf: (...a: unknown[]) => mockAddToShelf(...a),
  removeFromShelf: (...a: unknown[]) => mockRemoveFromShelf(...a),
  updateShelf: (...a: unknown[]) => mockUpdateShelf(...a),
}));

const pieza = (id: string, extra: Partial<LibraryItem> = {}) => ({ id, title: id, category: null, progress: 0, last_position: null, ...extra }) as LibraryItem;

function preparar() {
  const { Wrapper, queryClient } = crearWrapper();
  // Que la lista no se borre al quedarse sin observadores durante la prueba.
  queryClient.setQueryDefaults(libraryKeys.all, { gcTime: Infinity });
  queryClient.setQueryData(libraryKeys.items('u1'), [pieza('a'), pieza('b'), pieza('c')]);
  return { Wrapper, queryClient, lista: () => queryClient.getQueryData<LibraryItem[]>(libraryKeys.items('u1')) };
}

beforeEach(() => {
  mockRemove.mockReset().mockResolvedValue(undefined);
  mockUpdate.mockReset().mockResolvedValue({});
});

it('eliminar quita las piezas de inmediato y las borra de una en una', async () => {
  const { Wrapper, lista } = preparar();
  let resolver!: () => void;
  mockRemove.mockImplementationOnce(() => new Promise<void>((r) => (resolver = r)));
  const { result } = await renderHook(() => useRemoveLibraryItems(), { wrapper: Wrapper });
  await act(async () => {
    result.current.mutate(['a', 'c']);
  });
  expect(lista()?.map((p) => p.id)).toEqual(['b']);
  // La segunda espera a que termine la primera (cada una borra su carpeta en R2).
  expect(mockRemove).toHaveBeenCalledTimes(1);
  await act(async () => resolver());
  expect(mockRemove.mock.calls.map((c) => c[0])).toEqual(['a', 'c']);
});

it('la misma categoría a varias, al instante', async () => {
  const { Wrapper, lista } = preparar();
  const { result } = await renderHook(() => useSetLibraryCategory(), { wrapper: Wrapper });
  await act(async () => {
    result.current.mutate({ ids: ['a', 'b'], category: 'Escuela' });
  });
  expect(lista()?.map((p) => p.category)).toEqual(['Escuela', 'Escuela', null]);
  expect(mockUpdate).toHaveBeenCalledWith('a', { category: 'Escuela' });
  expect(mockUpdate).toHaveBeenCalledWith('b', { category: 'Escuela' });
});

it('editar se ve al instante y, si falla, se deshace', async () => {
  const { Wrapper, lista } = preparar();
  mockUpdate.mockRejectedValueOnce(new Error('sin red'));
  const { result } = await renderHook(() => useUpdateLibraryItem(), { wrapper: Wrapper });
  await act(async () => {
    result.current.mutate({ id: 'b', patch: { title: 'Nuevo' } });
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(lista()?.find((p) => p.id === 'b')?.title).toBe('b');
});

it('guardar la posición cambia el avance en la librería sin volver a pedirla', async () => {
  const { Wrapper, lista } = preparar();
  const { result } = await renderHook(() => useSaveReadingPosition(), { wrapper: Wrapper });
  await act(async () => {
    result.current.mutate({ id: 'c', patch: { last_position: { page: 4 }, progress: 0.4 } });
  });
  expect(lista()?.find((p) => p.id === 'c')).toEqual(expect.objectContaining({ progress: 0.4, last_position: { page: 4 } }));
  expect(mockUpdate).toHaveBeenCalledWith('c', { last_position: { page: 4 }, progress: 0.4 });
});

describe('libreros (T280)', () => {
  function conLibreros() {
    const { Wrapper, queryClient } = crearWrapper();
    queryClient.setQueryDefaults(libraryKeys.all, { gcTime: Infinity });
    queryClient.setQueryData(libraryKeys.shelves('u1'), [
      { id: 's1', name: 'Por leer', sort_order: 1024 },
      { id: 's2', name: 'Favoritos', sort_order: 2048 },
    ]);
    queryClient.setQueryData(libraryKeys.shelfItems('u1'), [{ shelf_id: 's1', item_id: 'a', sort_order: 1024, added_at: '' }]);
    return {
      Wrapper,
      libreros: () => queryClient.getQueryData<{ id: string }[]>(libraryKeys.shelves('u1')),
      enLibreros: () => queryClient.getQueryData<{ shelf_id: string; item_id: string; sort_order: number }[]>(libraryKeys.shelfItems('u1')),
    };
  }

  it('agregar pone al final las que faltan y no repite las que ya estaban', async () => {
    const { Wrapper, enLibreros } = conLibreros();
    const { result } = await renderHook(() => useShelfMutations(), { wrapper: Wrapper });
    await act(async () => {
      result.current.agregar.mutate({ shelfId: 's1', itemIds: ['a', 'b'] });
    });
    expect(enLibreros()?.filter((e) => e.shelf_id === 's1').map((e) => [e.item_id, e.sort_order])).toEqual([
      ['a', 1024],
      ['b', 2048],
    ]);
    expect(mockAddToShelf).toHaveBeenCalledWith('u1', 's1', 'b');
  });

  it('quitar saca del librero sin tocar la pieza', async () => {
    const { Wrapper, enLibreros } = conLibreros();
    const { result } = await renderHook(() => useShelfMutations(), { wrapper: Wrapper });
    await act(async () => {
      result.current.quitar.mutate({ shelfId: 's1', itemIds: ['a'] });
    });
    expect(enLibreros()).toEqual([]);
    expect(mockRemoveFromShelf).toHaveBeenCalledWith('s1', 'a');
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('reordenar libreros los numera en el nuevo orden', async () => {
    const { Wrapper, libreros } = conLibreros();
    const { result } = await renderHook(() => useShelfMutations(), { wrapper: Wrapper });
    await act(async () => {
      result.current.reordenar.mutate(['s2', 's1']);
    });
    expect(libreros()?.map((s) => s.id)).toEqual(['s2', 's1']);
    expect(mockUpdateShelf).toHaveBeenCalledWith('s2', { sort_order: 1024 });
    expect(mockUpdateShelf).toHaveBeenCalledWith('s1', { sort_order: 2048 });
  });
});

/** Sin conexión (RF-BR3, T285): la librería de la copia guardada, con el avance pendiente encima. */
describe('sin red', () => {
  const SIN_RED = new TypeError('Network request failed');

  it('la librería sale de la última lista guardada y el lector encuentra su libro', async () => {
    mockListar.mockResolvedValueOnce([pieza('a', { progress: 0.1 }), pieza('b')]);
    const primero = crearWrapper();
    const { result: conRed } = await renderHook(() => useLibraryItems(), { wrapper: primero.Wrapper });
    await waitFor(() => expect(conRed.current.isSuccess).toBe(true));

    // Leyendo sin red: el avance se queda en la cola.
    mockUpdate.mockRejectedValue(SIN_RED);
    const { result: guardar } = await renderHook(() => useSaveReadingPosition(), { wrapper: primero.Wrapper });
    await act(async () => {
      await guardar.current.mutateAsync({ id: 'a', patch: { last_position: { page: 30 }, progress: 0.3 } }).catch(() => undefined);
    });

    mockListar.mockRejectedValue(SIN_RED);
    mockUna.mockRejectedValue(SIN_RED);
    const otro = crearWrapper();
    const { result: sinRed } = await renderHook(() => useLibraryItems(), { wrapper: otro.Wrapper });
    await waitFor(() => expect(sinRed.current.isSuccess).toBe(true));
    expect(sinRed.current.data?.map((p) => [p.id, p.progress])).toEqual([
      ['a', 0.3],
      ['b', 0],
    ]);
    const { result: una } = await renderHook(() => useLibraryItem('a'), { wrapper: crearWrapper().Wrapper });
    await waitFor(() => expect(una.current.isSuccess).toBe(true));
    expect(una.current.data).toEqual(expect.objectContaining({ id: 'a', last_position: { page: 30 } }));
  });

  it('sin lista guardada, el error se ve como error', async () => {
    mockListar.mockRejectedValue(new Error('Algo más'));
    const { result } = await renderHook(() => useLibraryItems(), { wrapper: crearWrapper().Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('borrar piezas se lleva sus copias del teléfono', async () => {
    const { Wrapper } = preparar();
    const { result } = await renderHook(() => useRemoveLibraryItems(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync(['a']);
    });
    expect(mockBorrarCopias).toHaveBeenCalledWith(['a']);
  });
});
