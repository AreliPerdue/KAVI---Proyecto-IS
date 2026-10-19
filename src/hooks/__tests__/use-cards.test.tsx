/**
 * Fichas (spec 13d; T293): la primera vez se crean las tres incluidas, una sola vez; guardar un diseño con
 * fichas llenas "solo para las nuevas" archiva la versión de antes y crea la nueva (RF-BF5).
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useCardTemplates, useSaveCardTemplate } from '@/hooks/use-cards';

let mockPlantillas: Record<string, unknown>[] = [];
const mockGuardar = jest.fn(async (_u: string, p: Record<string, unknown>) => {
  const fila = { id: (p.id as string) ?? `p${mockPlantillas.length + 1}`, owner_id: 'u1', look: {}, archived: false, created_at: 'c', updated_at: 'u', ...p };
  mockPlantillas = [...mockPlantillas.filter((x) => x.id !== fila.id), fila];
  return fila;
});
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/services/library', () => ({
  listCardTemplates: async () => mockPlantillas,
  saveCardTemplate: (u: string, p: Record<string, unknown>) => mockGuardar(u, p),
  listCards: async () => [],
  removeCardTemplate: async () => undefined,
}));

beforeEach(() => {
  mockPlantillas = [];
  mockGuardar.mockClear();
});

it('sin plantillas, crea las tres incluidas una vez', async () => {
  const { result } = await renderHook(() => useCardTemplates(), { wrapper: crearWrapper().Wrapper });
  await waitFor(() => expect(result.current.data?.length).toBe(3));
  expect(mockGuardar.mock.calls.map(([, p]) => p.name)).toEqual(['Reseña rápida', 'Diario de lectura', 'Romance']);
});

it('con plantillas no crea nada', async () => {
  mockPlantillas = [{ id: 'mia', owner_id: 'u1', name: 'Mía', fields: [], look: {}, created_at: 'c', updated_at: 'u' }];
  const { result } = await renderHook(() => useCardTemplates(), { wrapper: crearWrapper().Wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(mockGuardar).not.toHaveBeenCalled();
});

it('"solo a las nuevas" archiva la de antes y crea la nueva; "a todas" la cambia', async () => {
  const romance = { id: 'r', owner_id: 'u1', name: 'Romance', fields: [{ id: 's', type: 'scale', label: 'Estrellas' }], look: {}, created_at: 'c', updated_at: 'u' };
  mockPlantillas = [romance];
  const { Wrapper, queryClient } = crearWrapper();
  queryClient.setQueryDefaults(['library'], { gcTime: Infinity });
  queryClient.setQueryData(['library', 'card-templates', 'u1'], [romance]);
  const { result } = await renderHook(() => useSaveCardTemplate(), { wrapper: Wrapper });
  const diseno = { name: 'Romance', fields: [{ id: 's', type: 'scale' as const, label: 'Calificación' }], look: {} };
  await act(async () => {
    await result.current.mutateAsync({ id: 'r', diseno, aplicar: 'nuevas' });
  });
  expect(mockGuardar.mock.calls[0][1]).toMatchObject({ id: 'r', archived: true, fields: [{ label: 'Estrellas' }] });
  expect(mockGuardar.mock.calls[1][1]).toEqual(diseno);
  mockGuardar.mockClear();
  await act(async () => {
    await result.current.mutateAsync({ id: 'r', diseno, aplicar: 'todas' });
  });
  expect(mockGuardar.mock.calls).toEqual([['u1', { id: 'r', ...diseno }]]);
});
