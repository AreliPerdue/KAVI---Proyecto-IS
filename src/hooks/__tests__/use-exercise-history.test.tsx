/**
 * Conversión de v1 (RF-F62, RF-F63): el texto libre se vuelve series, el nombre se liga al
 * catálogo solo si hay **una** coincidencia exacta, y lo convertido se marca. Si se corta a la
 * mitad, la siguiente vez termina sin duplicar: los ids de las series no cambian.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useLegacyConversion } from '@/hooks/use-exercise-history';
import { delCatalogo } from '@/lib/gym/__tests__/fixtures';
import type { WorkoutSet } from '@/types/domain';

const mockApi = { legacy: jest.fn(), save: jest.fn(), update: jest.fn(), mark: jest.fn(), catalogo: jest.fn() };

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/workouts', () => ({
  listLegacyExercises: (...a: unknown[]) => mockApi.legacy(...a),
  saveWorkoutSets: (...a: unknown[]) => mockApi.save(...a),
  updateExercise: (...a: unknown[]) => mockApi.update(...a),
  markLegacyConverted: (...a: unknown[]) => mockApi.mark(...a),
  getExerciseHistory: jest.fn(),
}));
jest.mock('@/services/exercises', () => ({ listExercises: (...a: unknown[]) => mockApi.catalogo(...a) }));

const v1 = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id, name, exercise_id: null, sets: '3', reps: '10', weight: '60 kg', duration_minutes: null, performed_at: '2026-05-01T10:00:00.000Z', ...over,
});

const CATALOGO = [
  delCatalogo('sentadilla', { name_es: 'Sentadilla' }),
  // Dos ejercicios con el mismo alias: "press" es ambiguo y no se liga.
  delCatalogo('press-banca', { name_es: 'Press de banca', aliases: ['press'] }),
  delCatalogo('press-militar', { name_es: 'Press militar', aliases: ['press'] }),
];

beforeEach(() => {
  for (const f of Object.values(mockApi)) f.mockReset().mockResolvedValue(undefined);
  mockApi.catalogo.mockResolvedValue(CATALOGO);
});

const correr = async () => {
  const { Wrapper } = crearWrapper();
  const hook = await renderHook(() => useLegacyConversion(), { wrapper: Wrapper });
  return hook;
};

it('convierte, liga solo coincidencias únicas y marca lo convertido', async () => {
  mockApi.legacy.mockResolvedValue([v1('e1', 'sentadilla'), v1('e2', 'press'), v1('e3', 'Banca', { exercise_id: 'press-banca' })]);
  await correr();
  await waitFor(() => expect(mockApi.mark).toHaveBeenCalled());

  const series = mockApi.save.mock.calls[0]?.[0] as WorkoutSet[];
  expect(series.filter((s) => s.workout_exercise_id === 'e1')).toHaveLength(3);
  expect(mockApi.update).toHaveBeenCalledTimes(1);
  expect(mockApi.update).toHaveBeenCalledWith('e1', { exercise_id: 'sentadilla' });
  expect(mockApi.mark).toHaveBeenCalledWith(['e1', 'e2', 'e3']);
});

it('sin nada pendiente no escribe nada', async () => {
  mockApi.legacy.mockResolvedValue([]);
  await correr();
  await waitFor(() => expect(mockApi.legacy).toHaveBeenCalled());
  expect(mockApi.save).not.toHaveBeenCalled();
  expect(mockApi.mark).not.toHaveBeenCalled();
});

it('si falla a la mitad, la siguiente vez termina con los mismos ids (sin duplicar)', async () => {
  mockApi.legacy.mockResolvedValue([v1('e1', 'sentadilla')]);
  mockApi.mark.mockRejectedValueOnce(new Error('sin red'));
  const primera = await correr();
  await waitFor(() => expect(mockApi.mark).toHaveBeenCalledTimes(1));
  await primera.unmount();

  await correr();
  await waitFor(() => expect(mockApi.mark).toHaveBeenCalledTimes(2));
  const ids = (n: number) => (mockApi.save.mock.calls[n]?.[0] as WorkoutSet[]).map((s) => s.id);
  expect(ids(1)).toEqual(ids(0));
});
