/**
 * Eliminar la cuenta (RF-A12, RF-A13): además del servidor, el dispositivo olvida lo de la
 * persona —la cola de series, el descanso, los avisos y la caché—; un fallo no borra nada.
 */
import { act, renderHook } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useDeleteAccount } from '@/hooks/use-auth-actions';
import { useGymStore } from '@/store/gym-store';
import { useOutboxStore } from '@/store/outbox-store';

const mockDelete = jest.fn();
const mockClearOutbox = jest.fn();
const mockSync = jest.fn();

jest.mock('@/services/auth', () => ({
  deleteAccount: (...a: unknown[]) => mockDelete(...a),
  changePassword: jest.fn(), resetPassword: jest.fn(), setPassword: jest.fn(), signIn: jest.fn(),
  signOut: jest.fn(), signUp: jest.fn(), startEmailSignUp: jest.fn(), verifyEmailOtp: jest.fn(),
}));
jest.mock('@/lib/gym/outbox', () => ({ clearOutbox: () => mockClearOutbox() }));
jest.mock('@/lib/notifications', () => ({ syncNotifications: (...a: unknown[]) => mockSync(...a) }));

const preparar = () => {
  const stopRest = jest.fn();
  useGymStore.setState({ stopRest } as never);
  useOutboxStore.setState({ entries: [{ op: 'remove', workoutId: 'w', setId: 's', at: 1 }], loaded: true });
  return stopRest;
};

beforeEach(() => {
  mockDelete.mockReset();
  mockClearOutbox.mockReset().mockResolvedValue(undefined);
  mockSync.mockReset().mockResolvedValue(0);
});

it('al eliminar limpia la cola, el descanso, los avisos y la caché', async () => {
  const stopRest = preparar();
  mockDelete.mockResolvedValue(undefined);
  const { Wrapper, queryClient } = crearWrapper();
  const limpiar = jest.spyOn(queryClient, 'clear');
  const { result } = await renderHook(() => useDeleteAccount(), { wrapper: Wrapper });
  await act(async () => { await result.current.mutateAsync({ email: 'a@b.c', password: 'x' }); });

  expect(mockDelete).toHaveBeenCalledWith('a@b.c', 'x');
  expect(stopRest).toHaveBeenCalled();
  expect(useOutboxStore.getState().entries).toEqual([]);
  expect(mockClearOutbox).toHaveBeenCalled();
  expect(mockSync).toHaveBeenCalledWith([]);
  expect(limpiar).toHaveBeenCalled();
});

it('si el servidor rechaza (contraseña mala) no se limpia nada', async () => {
  const stopRest = preparar();
  mockDelete.mockRejectedValue(new Error('Credenciales incorrectas'));
  const { Wrapper, queryClient } = crearWrapper();
  const limpiar = jest.spyOn(queryClient, 'clear');
  const { result } = await renderHook(() => useDeleteAccount(), { wrapper: Wrapper });
  await act(async () => { await result.current.mutateAsync({ email: 'a@b.c', password: 'mal' }).catch(() => undefined); });

  expect(stopRest).not.toHaveBeenCalled();
  expect(useOutboxStore.getState().entries).toHaveLength(1);
  expect(mockClearOutbox).not.toHaveBeenCalled();
  expect(limpiar).not.toHaveBeenCalled();
});
