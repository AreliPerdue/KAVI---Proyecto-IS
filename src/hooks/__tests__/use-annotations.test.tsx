/**
 * Lo anotado de un libro (spec 13c, T286): se ve al instante, pasa por la cola del dispositivo, sin red sale
 * de la copia guardada y todo se deshace y se rehace (RF-BH18).
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useAnnotationEditor, useAnnotations } from '@/hooks/use-annotations';
import { libraryKeys } from '@/hooks/use-library';
import type { LibraryAnnotation } from '@/types/domain';

const mockListar = jest.fn();
const mockEncolar = jest.fn(async (_e: unknown) => undefined);
const mockPendientes = jest.fn(async () => [] as unknown[]);
const mockGuardadas = jest.fn();
const mockGuardar = jest.fn(async (..._a: unknown[]) => undefined);
const mockSubir = jest.fn(async () => undefined);
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/library', () => ({ listAnnotations: (id: string) => mockListar(id) }));
jest.mock('@/hooks/use-library-sync', () => ({ subirPendientes: () => mockSubir() }));
jest.mock('@/lib/library/offline/outbox', () => ({
  ...jest.requireActual('@/lib/library/offline/outbox'),
  encolar: (e: unknown) => mockEncolar(e),
  pendientes: () => mockPendientes(),
}));
jest.mock('@/lib/library/offline/snapshot', () => ({
  guardarAnotaciones: (...a: unknown[]) => mockGuardar(...a),
  anotacionesGuardadas: (...a: unknown[]) => mockGuardadas(...a),
}));

const nota = (id: string, cambio: Partial<LibraryAnnotation> = {}): LibraryAnnotation => ({
  id,
  item_id: 'l1',
  owner_id: 'u1',
  kind: 'postit',
  locator: { page: 1, x: 0.1, y: 0.1, w: 0.24 },
  content: { text: id },
  z: 1,
  removed: false,
  locked: false,
  created_at: 'c',
  updated_at: 'u',
  ...cambio,
});

beforeEach(() => {
  for (const m of [mockListar, mockEncolar, mockGuardadas, mockGuardar, mockSubir]) m.mockClear();
  mockPendientes.mockResolvedValue([]);
});

describe('useAnnotations', () => {
  it('trae las del libro, guarda una copia y pone encima lo que la cola aún no sube', async () => {
    mockListar.mockResolvedValue([nota('a1'), nota('a2', { z: 2 })]);
    mockPendientes.mockResolvedValue([{ op: 'annotationRemove', itemId: 'l1', id: 'a2', at: 1 }]);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useAnnotations('l1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((a) => a.id)).toEqual(['a1']);
    expect(mockGuardar).toHaveBeenCalledWith('u1', 'l1', [nota('a1'), nota('a2', { z: 2 })]);
  });

  it('sin red usa la copia del dispositivo (RF-BR3)', async () => {
    mockListar.mockRejectedValue(new TypeError('Network request failed'));
    mockGuardadas.mockResolvedValue([nota('a1')]);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useAnnotations('l1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGuardadas).toHaveBeenCalledWith('u1', 'l1');
    expect(result.current.data).toEqual([nota('a1')]);
  });

  it('sin red y sin copia, el error se ve', async () => {
    mockListar.mockRejectedValue(new TypeError('Network request failed'));
    mockGuardadas.mockResolvedValue(null);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useAnnotations('l1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useAnnotationEditor', () => {
  function preparar(inicial: LibraryAnnotation[]) {
    const { Wrapper, queryClient } = crearWrapper();
    queryClient.setQueryDefaults(libraryKeys.all, { gcTime: Infinity });
    queryClient.setQueryData(libraryKeys.annotations('l1'), inicial);
    return { Wrapper, lista: () => queryClient.getQueryData<LibraryAnnotation[]>(libraryKeys.annotations('l1')) };
  }

  it('crear se ve al instante, va a la cola con su dueño y se deshace y rehace', async () => {
    const { Wrapper, lista } = preparar([nota('a1')]);
    const { result } = await renderHook(() => useAnnotationEditor('l1'), { wrapper: Wrapper });
    const nueva = nota('a2', { z: 2 });
    await act(async () => result.current.crear(nueva));
    expect(lista()?.map((a) => a.id)).toEqual(['a1', 'a2']);
    expect(mockEncolar).toHaveBeenLastCalledWith(expect.objectContaining({ op: 'annotation', itemId: 'l1', userId: 'u1', annotation: expect.objectContaining({ id: 'a2' }) }));
    expect(mockSubir).toHaveBeenCalled();
    expect(result.current.puedeDeshacer).toBe(true);

    await act(async () => result.current.deshacer());
    expect(lista()?.map((a) => a.id)).toEqual(['a1']);
    expect(mockEncolar).toHaveBeenLastCalledWith(expect.objectContaining({ op: 'annotationRemove', id: 'a2' }));

    await act(async () => result.current.rehacer());
    expect(lista()?.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('cambiar guarda la fila nueva y deshacer vuelve a la de antes, en su capa', async () => {
    const antes = nota('a1', { z: 1 });
    const { Wrapper, lista } = preparar([antes, nota('a2', { z: 2 })]);
    const { result } = await renderHook(() => useAnnotationEditor('l1'), { wrapper: Wrapper });
    await act(async () => result.current.cambiar(antes, { ...antes, z: 3, locked: true }));
    expect(lista()?.map((a) => [a.id, a.z, a.locked])).toEqual([
      ['a2', 2, false],
      ['a1', 3, true],
    ]);
    await act(async () => result.current.deshacer());
    expect(lista()?.map((a) => [a.id, a.z, a.locked])).toEqual([
      ['a1', 1, false],
      ['a2', 2, false],
    ]);
  });

  it('borrar se deshace con la misma anotación (mismo id)', async () => {
    const a1 = nota('a1');
    const { Wrapper, lista } = preparar([a1]);
    const { result } = await renderHook(() => useAnnotationEditor('l1'), { wrapper: Wrapper });
    await act(async () => result.current.borrar(a1));
    expect(lista()).toEqual([]);
    await act(async () => result.current.deshacer());
    expect(lista()).toEqual([a1]);
    expect(mockEncolar).toHaveBeenLastCalledWith(expect.objectContaining({ op: 'annotation', annotation: expect.objectContaining({ id: 'a1' }) }));
  });
});
