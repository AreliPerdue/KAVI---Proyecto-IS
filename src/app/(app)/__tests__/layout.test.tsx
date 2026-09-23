/**
 * Layout del área autenticada.
 *
 * No pinta nada por sí mismo, pero es donde se enganchan tres cosas que tienen
 * que ocurrir una sola vez al entrar: la reprogramación de recordatorios, la
 * suscripción a cambios en tiempo real y la carga de las preferencias del
 * dispositivo. Si la última no se hiciera aquí, el formato de hora elegido se
 * vería bien en Perfil pero el calendario abriría siempre en 24 h.
 */
import { render } from '@testing-library/react-native';

import AppLayout from '@/app/(app)/_layout';
import { usePreferencesStore } from '@/store/preferences-store';

const mockHydrate = jest.fn().mockResolvedValue(undefined);
const mockReminderSync = jest.fn();
const mockRealtime = jest.fn();
const mockSociales = jest.fn();

jest.mock('@/hooks/use-reminders', () => ({ useReminderSync: () => mockReminderSync() }));
jest.mock('@/hooks/use-realtime', () => ({ useRealtimeInvalidation: () => mockRealtime() }));
jest.mock('@/hooks/use-social-notifications', () => ({ useSocialNotifications: () => mockSociales() }));

jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dentro de la fabrica de jest.mock
  const { View } = require('react-native');
  /** Se declara con nombre: un componente anonimo dispara react/display-name. */
  function Stack({ children }: { children?: React.ReactNode }) {
    return <View>{children}</View>;
  }
  Stack.Screen = function Screen() {
    return null;
  };
  return { Stack };
});

beforeEach(() => {
  mockHydrate.mockClear();
  mockReminderSync.mockClear();
  mockRealtime.mockClear();
  mockSociales.mockClear();
  usePreferencesStore.setState({ hydrate: mockHydrate });
});

describe('arranque del área autenticada', () => {
  it('carga las preferencias del dispositivo', async () => {
    await render(<AppLayout />);
    expect(mockHydrate).toHaveBeenCalledTimes(1);
  });

  /** Volver a pintar no debe repetir la carga: el efecto no depende de nada cambiante. */
  it('no las vuelve a cargar al repintar', async () => {
    const { rerender } = await render(<AppLayout />);
    await rerender(<AppLayout />);
    expect(mockHydrate).toHaveBeenCalledTimes(1);
  });

  it('programa los recordatorios', async () => {
    await render(<AppLayout />);
    expect(mockReminderSync).toHaveBeenCalled();
  });

  it('se suscribe a los cambios en tiempo real', async () => {
    await render(<AppLayout />);
    expect(mockRealtime).toHaveBeenCalled();
  });

  it('activa los avisos de solicitudes e invitaciones (RF-S17)', async () => {
    await render(<AppLayout />);
    expect(mockSociales).toHaveBeenCalled();
  });

  it('se monta sin romperse', async () => {
    const { toJSON } = await render(<AppLayout />);
    expect(toJSON()).toBeTruthy();
  });
});
