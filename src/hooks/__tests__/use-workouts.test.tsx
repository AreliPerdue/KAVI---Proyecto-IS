/**
 * Hooks de entrenamientos (spec 07).
 *
 * El detalle que distingue a `updateExercise` del resto: solo invalida la lista
 * de nombres, no todo el historial. Cambiar unas repeticiones no cambia el
 * historial, pero si puede anadir un nombre nuevo al autocompletado (RF-F4).
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import {
  useExerciseNames,
  useWorkout,
  useWorkoutByActivity,
  useWorkoutMutations,
  useWorkouts,
  workoutKeys,
} from '@/hooks/use-workouts';

/** Prefijo `mock` obligatorio: Jest eleva la fabrica de `jest.mock`. */
const mockFns = {
  list: jest.fn(), get: jest.fn(), byActivity: jest.fn(), names: jest.fn(),
  create: jest.fn(), update: jest.fn(), remove: jest.fn(),
  addEx: jest.fn(), updateEx: jest.fn(), removeEx: jest.fn(), duplicate: jest.fn(),
};
let mockUserId: string | null = 'u1';

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock('@/services/workouts', () => ({
  listWorkouts: (...a: unknown[]) => mockFns.list(...a),
  getWorkout: (...a: unknown[]) => mockFns.get(...a),
  getWorkoutByActivity: (...a: unknown[]) => mockFns.byActivity(...a),
  listExerciseNames: (...a: unknown[]) => mockFns.names(...a),
  createWorkout: (...a: unknown[]) => mockFns.create(...a),
  updateWorkout: (...a: unknown[]) => mockFns.update(...a),
  removeWorkout: (...a: unknown[]) => mockFns.remove(...a),
  addExercise: (...a: unknown[]) => mockFns.addEx(...a),
  updateExercise: (...a: unknown[]) => mockFns.updateEx(...a),
  removeExercise: (...a: unknown[]) => mockFns.removeEx(...a),
  duplicateWorkout: (...a: unknown[]) => mockFns.duplicate(...a),
}));

beforeEach(() => {
  mockUserId = 'u1';
  for (const fn of Object.values(mockFns)) fn.mockReset();
});

const montar = async () => {
  const { Wrapper, queryClient } = crearWrapper();
  const { result } = await renderHook(() => useWorkoutMutations(), { wrapper: Wrapper });
  return { result, queryClient };
};

describe('claves', () => {
  it('separan lista, detalle, actividad y nombres', () => {
    expect(workoutKeys.list('u1')).toEqual(['workouts', 'list', 'u1']);
    expect(workoutKeys.detail('w1')).toEqual(['workouts', 'detail', 'w1']);
    expect(workoutKeys.byActivity('a1', 'u1')).toEqual(['workouts', 'activity', 'a1', 'u1']);
    expect(workoutKeys.names('u1')).toEqual(['workouts', 'names', 'u1']);
  });
});

describe('consultas', () => {
  it('useWorkouts pide el historial del usuario', async () => {
    mockFns.list.mockResolvedValue([]);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useWorkouts(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFns.list).toHaveBeenCalledWith('u1');
  });

  it('useWorkout pide por id', async () => {
    mockFns.get.mockResolvedValue({ id: 'w1' });
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useWorkout('w1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFns.get).toHaveBeenCalledWith('w1');
  });

  it('useWorkout sin id no consulta', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useWorkout(undefined), { wrapper: Wrapper });
    expect(mockFns.get).not.toHaveBeenCalled();
  });

  it('useWorkoutByActivity cruza actividad y usuario', async () => {
    mockFns.byActivity.mockResolvedValue(null);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useWorkoutByActivity('a1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFns.byActivity).toHaveBeenCalledWith('a1', 'u1');
  });

  it('useWorkoutByActivity se puede desactivar a mano', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useWorkoutByActivity('a1', false), { wrapper: Wrapper });
    expect(mockFns.byActivity).not.toHaveBeenCalled();
  });

  it('useExerciseNames pide el autocompletado propio', async () => {
    mockFns.names.mockResolvedValue(['Sentadilla']);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useExerciseNames(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFns.names).toHaveBeenCalledWith('u1');
  });
});

describe('mutaciones', () => {
  it('crear pasa el usuario', async () => {
    mockFns.create.mockResolvedValue({ id: 'w1' });
    const { result } = await montar();

    await result.current.create.mutateAsync({ performed_at: 'x' });

    expect(mockFns.create).toHaveBeenCalledWith('u1', { performed_at: 'x' });
  });

  it('actualizar pasa id y parche', async () => {
    mockFns.update.mockResolvedValue({ id: 'w1' });
    const { result } = await montar();

    await result.current.update.mutateAsync({ id: 'w1', patch: { notes: 'X' } });

    expect(mockFns.update).toHaveBeenCalledWith('w1', { notes: 'X' });
  });

  it('eliminar pasa el id', async () => {
    mockFns.remove.mockResolvedValue(undefined);
    const { result } = await montar();

    await result.current.remove.mutateAsync('w1');

    expect(mockFns.remove).toHaveBeenCalledWith('w1');
  });

  it('anadir ejercicio pasa entrenamiento y datos', async () => {
    mockFns.addEx.mockResolvedValue({ id: 'e1' });
    const { result } = await montar();

    const input = { name: 'Prensa', sets: null, reps: null, weight: null, duration_minutes: null, notes: null };
    await result.current.addExercise.mutateAsync({ workoutId: 'w1', input });

    expect(mockFns.addEx).toHaveBeenCalledWith('w1', input);
  });

  it('editar un ejercicio solo refresca el autocompletado (RF-F4)', async () => {
    mockFns.updateEx.mockResolvedValue({ id: 'e1' });
    const { result, queryClient } = await montar();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');

    await result.current.updateExercise.mutateAsync({ id: 'e1', patch: { sets: 5 } });

    expect(espia).toHaveBeenCalledWith({ queryKey: workoutKeys.names('u1') });
    expect(espia).not.toHaveBeenCalledWith({ queryKey: workoutKeys.all });
  });

  it('eliminar un ejercicio si refresca todo el historial', async () => {
    mockFns.removeEx.mockResolvedValue(undefined);
    const { result, queryClient } = await montar();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');

    await result.current.removeExercise.mutateAsync('e1');

    expect(espia).toHaveBeenCalledWith({ queryKey: workoutKeys.all });
  });

  it('duplicar propaga destino y si se conservan valores (RF-F8)', async () => {
    mockFns.duplicate.mockResolvedValue({ id: 'w2' });
    const { result } = await montar();

    const target = { activityId: null, performedAt: 'y', keepValues: true };
    await result.current.duplicate.mutateAsync({ workoutId: 'w1', target });

    expect(mockFns.duplicate).toHaveBeenCalledWith('u1', 'w1', target);
  });

  it('un fallo al crear se propaga', async () => {
    mockFns.create.mockRejectedValue(new Error('Esa actividad ya tiene un entrenamiento registrado.'));
    const { result } = await montar();

    await expect(result.current.create.mutateAsync({ performed_at: 'x' })).rejects.toThrow(/ya tiene un entrenamiento/i);
  });
});
