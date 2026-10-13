/** Pantalla completa del libro real (RF-BR5, T284): en Android se esconde la barra de navegación. */
import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockVisibilidad = jest.fn(async (_visibilidad: string) => undefined);
jest.mock('expo-navigation-bar', () => ({ setVisibilityAsync: (v: string) => mockVisibilidad(v) }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const { usePantallaCompleta } = require('@/hooks/use-full-screen') as typeof import('@/hooks/use-full-screen');

const original = Platform.OS;
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: original });
  mockVisibilidad.mockClear();
});

it('en Android la esconde al entrar y la regresa al salir', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  const { rerender } = await renderHook(({ activa }: { activa: boolean }) => usePantallaCompleta(activa), { initialProps: { activa: true } });
  expect(mockVisibilidad).toHaveBeenLastCalledWith('hidden');
  await rerender({ activa: false });
  expect(mockVisibilidad).toHaveBeenLastCalledWith('visible');
});

it('en iPhone no toca nada (la barra de estado la esconde la pantalla)', async () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios' });
  await renderHook(() => usePantallaCompleta(true));
  expect(mockVisibilidad).not.toHaveBeenCalled();
});
