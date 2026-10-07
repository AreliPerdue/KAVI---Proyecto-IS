/**
 * Qué sesiones cuentan para la racha y los logros (RF-F57 – RF-F60): un plan del formulario
 * de actividad (RF-F9) no cuenta mientras no llegue su hora ni si nunca se marcó nada.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useGymProgress } from '@/hooks/use-gym-progress';
import { ejercicio, serie, sesion } from '@/lib/gym/__tests__/fixtures';

const mockLog = jest.fn();

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/workouts', () => ({
  getTrainingLog: (...a: unknown[]) => mockLog(...a),
  listStreakEvents: () => Promise.resolve([]),
  saveStreakEvents: jest.fn(),
}));
jest.mock('@/services/exercises', () => ({
  listExercises: () => Promise.resolve([]),
  listExercisePrefs: () => Promise.resolve([]),
  saveExercisePrefs: jest.fn(),
  createCustomExercise: jest.fn(),
  updateCustomExercise: jest.fn(),
}));

const dias = (n: number) => new Date(Date.now() + n * 86_400_000);

it('excluye las futuras y las que tienen series sin marcar; incluye las de v1 sin series', async () => {
  const hecha = sesion(dias(-2), [ejercicio('banca', [serie(100, 5)])], { id: 'hecha' });
  const futura = sesion(dias(2), [ejercicio('banca', [serie(100, 5)])], { id: 'futura' });
  const sinMarcar = sesion(dias(-1), [ejercicio('banca', [serie(100, 5, { completed_at: null })])], { id: 'plan' });
  const v1 = sesion(dias(-3), [ejercicio(null, [])], { id: 'v1' });
  const vacia = sesion(dias(-4), [], { id: 'vacia-v1' });
  mockLog.mockResolvedValue([vacia, v1, hecha, sinMarcar, futura]);

  const { Wrapper } = crearWrapper();
  const { result } = await renderHook(() => useGymProgress(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.streak).not.toBeNull());
  expect(result.current.sessions.map((s) => s.id)).toEqual(['vacia-v1', 'v1', 'hecha']);
  expect(result.current.log.data).toHaveLength(5);
});
