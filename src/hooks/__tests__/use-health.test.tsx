/**
 * Desconectar la salud (spec 11, RF-H8): olvida los totales y las sesiones de la caché y vuelve
 * a pedir los permisos, así que la pestaña Actividad regresa a "Conecta tu actividad".
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { anyPermission, healthKeys, useHealthConnection, useHealthPermissions } from '@/hooks/use-health';

const mockApi = { disconnect: jest.fn(), permissions: jest.fn(), requestPermissions: jest.fn() };
jest.mock('@/services/health', () => ({
  healthApi: {
    disconnect: () => mockApi.disconnect(),
    permissions: () => mockApi.permissions(),
    requestPermissions: (m: unknown) => mockApi.requestPermissions(m),
  },
}));

const CON = { steps: true, activeEnergy: true, exercise: true, heartRate: false };
const SIN = { steps: false, activeEnergy: false, exercise: false, heartRate: false };

it('desconectar borra totales y sesiones y vuelve a pedir los permisos', async () => {
  mockApi.disconnect.mockResolvedValue(undefined);
  mockApi.permissions.mockResolvedValueOnce(CON).mockResolvedValue(SIN);
  const { Wrapper, queryClient } = crearWrapper();
  queryClient.setQueryDefaults(['health'], { gcTime: Infinity });
  queryClient.setQueryData(healthKeys.totals('2026-10-01', '2026-10-07'), [{ day: '2026-10-07', steps: 9000 }]);
  queryClient.setQueryData(healthKeys.sessions('a', 'b'), [{ id: 'x' }]);

  const { result } = await renderHook(() => ({ conexion: useHealthConnection(), permisos: useHealthPermissions() }), { wrapper: Wrapper });
  await waitFor(() => expect(anyPermission(result.current.permisos.data)).toBe(true));

  await act(async () => { await result.current.conexion.disconnect.mutateAsync(); });
  expect(mockApi.disconnect).toHaveBeenCalled();
  expect(queryClient.getQueryData(healthKeys.totals('2026-10-01', '2026-10-07'))).toBeUndefined();
  expect(queryClient.getQueryData(healthKeys.sessions('a', 'b'))).toBeUndefined();
  await waitFor(() => expect(anyPermission(result.current.permisos.data)).toBe(false));
});

it('conectar guarda los permisos que concedió la plataforma', async () => {
  mockApi.requestPermissions.mockResolvedValue(CON);
  mockApi.permissions.mockResolvedValue(CON);
  const { Wrapper, queryClient } = crearWrapper();
  queryClient.setQueryDefaults(['health'], { gcTime: Infinity });
  const { result } = await renderHook(() => useHealthConnection(), { wrapper: Wrapper });
  await act(async () => { await result.current.connect.mutateAsync(['steps']); });
  expect(mockApi.requestPermissions).toHaveBeenCalledWith(['steps']);
  expect(queryClient.getQueryData(healthKeys.permissions)).toEqual(CON);
});
