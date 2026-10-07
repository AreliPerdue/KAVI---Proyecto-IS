/**
 * Nota fija de un ejercicio (RF-F52): se escribe en las preferencias al momento, sin esperar
 * al servidor, y si el servidor falla se vuelve a pedir lo verdadero.
 */
import { act, renderHook } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { exerciseKeys, useExerciseMutations } from '@/hooks/use-exercises';
import type { ExercisePrefs } from '@/services/exercises';

const mockSave = jest.fn();
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/exercises', () => ({
  saveExercisePrefs: (...a: unknown[]) => mockSave(...a),
  listExercisePrefs: jest.fn(), listExercises: jest.fn(), createCustomExercise: jest.fn(), updateCustomExercise: jest.fn(),
}));

beforeEach(() => mockSave.mockReset());

const montar = async (prefs: ExercisePrefs[]) => {
  const { Wrapper, queryClient } = crearWrapper();
  queryClient.setQueryDefaults(exerciseKeys.prefs('u1'), { gcTime: Infinity });
  queryClient.setQueryData(exerciseKeys.prefs('u1'), prefs);
  const { result } = await renderHook(() => useExerciseMutations(), { wrapper: Wrapper });
  return { result, queryClient, prefs: () => queryClient.getQueryData<ExercisePrefs[]>(exerciseKeys.prefs('u1')) };
};

it('es optimista: la nota aparece en las preferencias antes de que responda el servidor', async () => {
  let contestar: () => void = () => undefined;
  mockSave.mockReturnValue(new Promise<void>((r) => { contestar = r; }));
  const { result, prefs } = await montar([{ exercise_id: 'banca', is_favorite: true, sticky_note: null, last_used_at: null }]);
  await act(async () => { result.current.saveStickyNote.mutate({ exerciseId: 'banca', note: 'Codos a 45°' }); });
  expect(prefs()).toEqual([expect.objectContaining({ exercise_id: 'banca', sticky_note: 'Codos a 45°', is_favorite: true })]);
  expect(mockSave).toHaveBeenCalledWith('u1', 'banca', { sticky_note: 'Codos a 45°' });
  await act(async () => { contestar(); });
});

it('crea la fila de preferencias si el ejercicio no tenía, y una nota vacía guarda null', async () => {
  mockSave.mockResolvedValue(undefined);
  const { result, prefs } = await montar([]);
  await act(async () => { await result.current.saveStickyNote.mutateAsync({ exerciseId: 'curl', note: null }); });
  expect(prefs()).toEqual([{ exercise_id: 'curl', is_favorite: false, sticky_note: null, last_used_at: null }]);
  expect(mockSave).toHaveBeenCalledWith('u1', 'curl', { sticky_note: null });
});

it('si el servidor falla, vuelve a pedir las preferencias', async () => {
  mockSave.mockRejectedValue(new Error('x'));
  const { result, queryClient } = await montar([]);
  const invalidar = jest.spyOn(queryClient, 'invalidateQueries');
  await act(async () => { await result.current.saveStickyNote.mutateAsync({ exerciseId: 'curl', note: 'n' }).catch(() => undefined); });
  expect(invalidar).toHaveBeenCalledWith({ queryKey: exerciseKeys.prefs('u1') });
});
