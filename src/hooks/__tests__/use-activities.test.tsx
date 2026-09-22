/**
 * Hooks de actividades (NFR-1, NFR-2).
 *
 * Dos comportamientos de rendimiento que no se ven leyendo el componente: el
 * cache va por rango, y `placeholderData` conserva el rango anterior mientras
 * llega el nuevo, que es lo que evita el parpadeo a blanco al cambiar de mes.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { activityKeys, useActivitiesRange, usePrefetchAdjacentRanges } from '@/hooks/use-activities-range';
import { useActivity, useActivityMutations } from '@/hooks/use-activity';

const mockList = jest.fn();
const mockGet = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
let mockUserId: string | null = 'u1';

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock('@/services/activities', () => ({
  listActivitiesByRange: (...a: unknown[]) => mockList(...a),
  getActivity: (...a: unknown[]) => mockGet(...a),
  createActivity: (...a: unknown[]) => mockCreate(...a),
  updateActivity: (...a: unknown[]) => mockUpdate(...a),
  removeActivity: (...a: unknown[]) => mockRemove(...a),
}));

const RANGO = { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) };
const actividad = (over = {}) => ({ id: 'a1', title: 'Junta', owner_id: 'u1', ...over });

beforeEach(() => {
  mockUserId = 'u1';
  for (const m of [mockList, mockGet, mockCreate, mockUpdate, mockRemove]) m.mockReset();
});

describe('activityKeys', () => {
  it('la clave de rango distingue usuario y extremos', () => {
    expect(activityKeys.range('u1', 'A', 'B')).toEqual(['activities', 'range', 'u1', 'A', 'B']);
  });

  it('dos rangos distintos no comparten cache', () => {
    expect(activityKeys.range('u1', 'A', 'B')).not.toEqual(activityKeys.range('u1', 'B', 'C'));
  });

  it('la clave raiz invalida todo lo de actividades', () => {
    expect(activityKeys.all).toEqual(['activities']);
  });
});

describe('useActivitiesRange', () => {
  it('consulta con los extremos en ISO', async () => {
    mockList.mockResolvedValue([actividad()]);
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => useActivitiesRange(RANGO), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith('u1', RANGO.from.toISOString(), RANGO.to.toISOString());
  });

  it('no consulta sin sesion', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();

    await renderHook(() => useActivitiesRange(RANGO), { wrapper: Wrapper });

    expect(mockList).not.toHaveBeenCalled();
  });

  it('expone el error', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => useActivitiesRange(RANGO), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('usePrefetchAdjacentRanges (NFR-2)', () => {
  it('precarga el rango anterior y el siguiente', async () => {
    mockList.mockResolvedValue([]);
    const { Wrapper } = crearWrapper();

    await renderHook(() => usePrefetchAdjacentRanges('month', new Date(2026, 8, 15)), { wrapper: Wrapper });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it('sin sesion no precarga nada', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();

    await renderHook(() => usePrefetchAdjacentRanges('month', new Date(2026, 8, 15)), { wrapper: Wrapper });

    expect(mockList).not.toHaveBeenCalled();
  });

  it('funciona igual en vista semanal', async () => {
    mockList.mockResolvedValue([]);
    const { Wrapper } = crearWrapper();

    await renderHook(() => usePrefetchAdjacentRanges('week', new Date(2026, 8, 15)), { wrapper: Wrapper });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });
});

describe('useActivity', () => {
  it('pide el detalle por id', async () => {
    mockGet.mockResolvedValue(actividad());
    const { Wrapper } = crearWrapper();

    const { result } = await renderHook(() => useActivity('a1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('a1');
  });

  it('sin id no consulta', async () => {
    const { Wrapper } = crearWrapper();

    await renderHook(() => useActivity(undefined), { wrapper: Wrapper });

    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('useActivityMutations', () => {
  it('crear pasa el usuario y la entrada', async () => {
    mockCreate.mockResolvedValue(actividad());
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useActivityMutations(), { wrapper: Wrapper });

    const input = { title: 'Junta', start_at: 'a', end_at: 'b' };
    await result.current.create.mutateAsync(input);

    expect(mockCreate).toHaveBeenCalledWith('u1', input);
  });

  it('actualizar propaga el alcance de la recurrencia', async () => {
    mockUpdate.mockResolvedValue(actividad());
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useActivityMutations(), { wrapper: Wrapper });

    await result.current.update.mutateAsync({ id: 'a1', patch: { title: 'X' }, scope: 'series' });

    expect(mockUpdate).toHaveBeenCalledWith('a1', { title: 'X' }, 'series');
  });

  it('actualizar refresca el detalle en cache sin esperar a la red', async () => {
    const actualizada = actividad({ title: 'Nuevo' });
    mockUpdate.mockResolvedValue(actualizada);
    const { Wrapper, queryClient } = crearWrapper();
    const { result } = await renderHook(() => useActivityMutations(), { wrapper: Wrapper });

    await result.current.update.mutateAsync({ id: 'a1', patch: { title: 'Nuevo' } });

    expect(queryClient.getQueryData(activityKeys.detail('a1'))).toEqual(actualizada);
  });

  it('eliminar propaga el alcance', async () => {
    mockRemove.mockResolvedValue(undefined);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useActivityMutations(), { wrapper: Wrapper });

    await result.current.remove.mutateAsync({ id: 'a1', scope: 'series' });

    expect(mockRemove).toHaveBeenCalledWith('a1', 'series');
  });

  it('crear invalida el calendario', async () => {
    mockCreate.mockResolvedValue(actividad());
    const { Wrapper, queryClient } = crearWrapper();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useActivityMutations(), { wrapper: Wrapper });

    await result.current.create.mutateAsync({ title: 'X', start_at: 'a', end_at: 'b' });

    expect(espia).toHaveBeenCalledWith({ queryKey: activityKeys.all });
  });

  it('un fallo al crear se propaga', async () => {
    mockCreate.mockRejectedValue(new Error('No tienes permiso para hacer eso.'));
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useActivityMutations(), { wrapper: Wrapper });

    await expect(
      result.current.create.mutateAsync({ title: 'X', start_at: 'a', end_at: 'b' }),
    ).rejects.toThrow(/permiso/i);
  });
});
