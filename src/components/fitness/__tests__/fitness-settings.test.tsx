/**
 * Ajustes de Fitness (spec 07 v2 §10, RF-F67; antes "Ajustes de gimnasio en Perfil"): cada
 * control escribe su preferencia del dispositivo, Modo serio esconde el trato, y desconectar
 * la salud pide confirmación.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FitnessSettings } from '@/components/fitness/fitness-settings';
import { es } from '@/i18n/es';
import { DEFAULT_GYM_PREFS, useGymStore } from '@/store/gym-store';

const F = es.fitness;
const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockDisconnect = jest.fn();
let mockPermisos: Record<string, boolean> = {};

jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));
jest.mock('@/hooks/use-health', () => ({
  anyPermission: (p: Record<string, boolean> | undefined) => !!p && Object.values(p).some(Boolean),
  useHealthAvailability: () => ({ data: { status: 'available', source: 'healthConnect' } }),
  useHealthPermissions: () => ({ data: mockPermisos }),
  useHealthConnection: () => ({ connect: { mutate: jest.fn(), isPending: false }, disconnect: { mutate: mockDisconnect, isPending: false } }),
}));

const setPref = jest.fn();
beforeEach(() => {
  setPref.mockReset();
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  mockDisconnect.mockReset();
  mockPermisos = {};
  useGymStore.setState({ ...DEFAULT_GYM_PREFS, setPref } as never);
});

it('cada control escribe su preferencia', async () => {
  await render(<FitnessSettings />);
  await fireEvent.press(screen.getByRole('tab', { name: F.settings.pounds }));
  await fireEvent.press(screen.getByRole('tab', { name: F.settings.rpe }));
  await fireEvent.press(screen.getByRole('tab', { name: '3 min' }));
  await fireEvent.press(screen.getByRole('tab', { name: '25 %' }));
  expect(setPref.mock.calls).toEqual(expect.arrayContaining([['weightUnit', 'lb'], ['effortScale', 'rpe'], ['restDefaultSec', 180], ['dropPercent', 25]]));
});

it('con Modo serio no se ofrece el trato', async () => {
  useGymStore.setState({ seriousMode: false });
  const { rerender } = await render(<FitnessSettings />);
  expect(screen.getByText(F.settings.voice)).toBeTruthy();
  await fireEvent.press(screen.getByRole('switch', { name: F.settings.serious }));
  expect(setPref).toHaveBeenCalledWith('seriousMode', true);
  useGymStore.setState({ seriousMode: true });
  await rerender(<FitnessSettings />);
  expect(screen.queryByText(F.settings.voice)).toBeNull();
});

it('desconectar la salud pide confirmación y avisa', async () => {
  mockPermisos = { steps: true };
  mockDisconnect.mockImplementation((_v, o: { onSuccess: () => void }) => o.onSuccess());
  await render(<FitnessSettings />);
  await fireEvent.press(screen.getByRole('button', { name: F.health.disconnect }));
  expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: F.health.disconnectTitle }));
  expect(mockDisconnect).toHaveBeenCalled();
  expect(mockSnackbar).toHaveBeenCalledWith({ message: F.health.disconnected });
});

it('cancelar no desconecta', async () => {
  mockPermisos = { steps: true };
  mockConfirm.mockResolvedValue(false);
  await render(<FitnessSettings />);
  await fireEvent.press(screen.getByRole('button', { name: F.health.disconnect }));
  expect(mockDisconnect).not.toHaveBeenCalled();
});
