/**
 * Cola de series de la sesión activa (RF-F17 – RF-F19): la pantalla no espera a la red, un
 * envío que falla se reintenta solo y nada de lo que llega mientras se envía se pierde.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { flushOutbox, useOutboxBootstrap, useSetActions } from '@/hooks/use-set-sync';
import type { OutboxEntry } from '@/lib/gym/outbox';
import { useOutboxStore } from '@/store/outbox-store';
import type { WorkoutSet } from '@/types/domain';

const mockSave = jest.fn();
const mockRemove = jest.fn();
const mockDisco = { enqueue: jest.fn(), acknowledge: jest.fn(), loadOutbox: jest.fn() };

jest.mock('@/services/workouts', () => ({
  saveWorkoutSets: (...a: unknown[]) => mockSave(...a),
  removeWorkoutSets: (...a: unknown[]) => mockRemove(...a),
  getWorkout: jest.fn(),
}));
jest.mock('@/lib/gym/outbox', () => ({
  ...jest.requireActual('@/lib/gym/outbox'),
  enqueue: (...a: unknown[]) => mockDisco.enqueue(...a),
  acknowledge: (...a: unknown[]) => mockDisco.acknowledge(...a),
  loadOutbox: (...a: unknown[]) => mockDisco.loadOutbox(...a),
}));
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));

const serie = (id: string, reps = 5) => ({ id, workout_exercise_id: 'we', sort_order: 1, segments: [{ reps }] }) as unknown as WorkoutSet;
const guardar = (id: string, at: number, reps = 5): OutboxEntry => ({ op: 'save', workoutId: 'w1', set: serie(id, reps), at });

/** Deja correr las promesas encadenadas (disco → red → limpieza). */
const vaciar = async () => {
  for (let i = 0; i < 6; i++) await act(async () => { await Promise.resolve(); });
};

beforeEach(() => {
  jest.useRealTimers();
  useOutboxStore.setState({ entries: [], loaded: false });
  mockSave.mockReset().mockResolvedValue(undefined);
  mockRemove.mockReset().mockResolvedValue(undefined);
  mockDisco.enqueue.mockReset().mockResolvedValue(undefined);
  mockDisco.acknowledge.mockReset().mockResolvedValue(undefined);
  mockDisco.loadOutbox.mockReset().mockResolvedValue([]);
});

describe('flushOutbox', () => {
  it('manda guardados y borrados y vacía la cola al confirmar', async () => {
    const { queryClient } = crearWrapper();
    useOutboxStore.setState({ entries: [guardar('s1', 1), { op: 'remove', workoutId: 'w1', setId: 's2', at: 2 }] });
    await flushOutbox(queryClient);
    expect(mockSave).toHaveBeenCalledWith([expect.objectContaining({ id: 's1' })]);
    expect(mockRemove).toHaveBeenCalledWith(['s2']);
    expect(useOutboxStore.getState().entries).toEqual([]);
    expect(mockDisco.acknowledge).toHaveBeenCalled();
  });

  it('un envío que falla deja la serie pendiente y se reintenta a los 10 s', async () => {
    jest.useFakeTimers();
    const { queryClient } = crearWrapper();
    mockSave.mockRejectedValueOnce(new Error('sin red'));
    useOutboxStore.setState({ entries: [guardar('s1', 1)] });
    await flushOutbox(queryClient);
    expect(useOutboxStore.getState().entries).toHaveLength(1);
    expect(mockSave).toHaveBeenCalledTimes(1);

    await act(async () => { jest.advanceTimersByTime(9_999); });
    expect(mockSave).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(1); });
    await vaciar();
    expect(mockSave).toHaveBeenCalledTimes(2);
    expect(useOutboxStore.getState().entries).toEqual([]);
  });

  it('un cambio que llega durante el envío no se pierde: queda en la cola y sale en otra vuelta', async () => {
    const { queryClient } = crearWrapper();
    let soltar: () => void = () => undefined;
    mockSave.mockImplementationOnce(() => new Promise<void>((r) => { soltar = r; }));
    useOutboxStore.setState({ entries: [guardar('s1', 1, 5)] });

    const primera = flushOutbox(queryClient);
    // Mientras viaja, la persona cambia la misma serie y agrega otra.
    useOutboxStore.getState().setEntries(() => [guardar('s1', 2, 8), guardar('s3', 3)]);
    await flushOutbox(queryClient); // ocupado: solo pide otra vuelta
    expect(mockSave).toHaveBeenCalledTimes(1);

    soltar();
    await primera;
    await vaciar();
    expect(mockSave).toHaveBeenCalledTimes(2);
    const segunda = mockSave.mock.calls[1]?.[0] as WorkoutSet[];
    expect(segunda.map((s) => s.id).sort()).toEqual(['s1', 's3']);
    expect((segunda.find((s) => s.id === 's1')?.segments[0] as { reps: number }).reps).toBe(8);
    expect(useOutboxStore.getState().entries).toEqual([]);
  });
});

describe('useSetActions', () => {
  it('pinta al instante, escribe al disco y luego envía', async () => {
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useSetActions('w1'), { wrapper: Wrapper });
    await act(async () => { result.current.saveSet(serie('s9')); });
    expect(mockDisco.enqueue).toHaveBeenCalledWith(expect.objectContaining({ op: 'save', workoutId: 'w1' }));
    await vaciar();
    expect(mockSave).toHaveBeenCalledWith([expect.objectContaining({ id: 's9' })]);
  });

  it('el último cambio de una serie reemplaza al anterior: solo viaja el borrado', async () => {
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useSetActions('w1'), { wrapper: Wrapper });
    await act(async () => {
      result.current.saveSet(serie('s1', 5));
      result.current.removeSet('s1');
    });
    await vaciar();
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith(['s1']);
    expect(useOutboxStore.getState().entries).toEqual([]);
  });
});

describe('useOutboxBootstrap', () => {
  it('carga la cola del disco una vez y la reenvía; al volver la app al frente, otra vez', async () => {
    const oyentes: ((s: string) => void)[] = [];
    const spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_t, fn) => {
      oyentes.push(fn as (s: string) => void);
      return { remove: jest.fn() } as never;
    });
    mockDisco.loadOutbox.mockResolvedValue([guardar('s1', 1)]);
    mockSave.mockRejectedValueOnce(new Error('sin red'));
    const { Wrapper } = crearWrapper();
    await renderHook(() => useOutboxBootstrap(), { wrapper: Wrapper });
    await vaciar();
    expect(mockDisco.loadOutbox).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(useOutboxStore.getState().entries).toHaveLength(1);

    await act(async () => { oyentes.forEach((f) => f('active')); });
    await vaciar();
    expect(mockSave).toHaveBeenCalledTimes(2);
    expect(useOutboxStore.getState().entries).toEqual([]);
    spy.mockRestore();
  });
});
