/**
 * Hooks de recordatorios (RF-C9, RF-C10, plan §3.4).
 *
 * `useReminderSync` es el que reprograma las notificaciones locales. Lo delicado
 * es que solo debe hacerlo cuando los recordatorios cambian de verdad: comparar
 * por identidad de objeto reprogramaria en cada render, y React Query devuelve
 * objetos nuevos con frecuencia.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import {
  reminderKeys,
  useActivityReminders,
  useReminderMutations,
  useReminderSync,
  useUpcomingReminders,
} from '@/hooks/use-reminders';

const mockList = jest.fn();
const mockSet = jest.fn();
const mockSetEnabled = jest.fn();
const mockUpcoming = jest.fn();
const mockSync = jest.fn();
let mockUserId: string | null = 'u1';

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: mockUserId }) }));
jest.mock('@/services/reminders', () => ({
  listRemindersByActivity: (...a: unknown[]) => mockList(...a),
  setRemindersForActivity: (...a: unknown[]) => mockSet(...a),
  setReminderEnabled: (...a: unknown[]) => mockSetEnabled(...a),
  listUpcomingReminders: (...a: unknown[]) => mockUpcoming(...a),
}));
jest.mock('@/lib/notifications', () => ({ syncNotifications: (...a: unknown[]) => mockSync(...a) }));


const proximo = (over = {}) => ({
  reminderId: 'r1', activityId: 'a1', title: 'Junta',
  body: 'Empieza a las 09:00', fireAt: '2026-09-07T08:50:00.000Z',
  activityStartAt: '2026-09-07T09:00:00.000Z', ...over,
});

beforeEach(() => {
  mockUserId = 'u1';
  for (const m of [mockList, mockSet, mockSetEnabled, mockUpcoming, mockSync]) m.mockReset();
  mockList.mockResolvedValue([]);
  mockUpcoming.mockResolvedValue([]);
  mockSync.mockResolvedValue(0);
});

describe('claves', () => {
  it('separan por actividad y por usuario', () => {
    expect(reminderKeys.byActivity('a1', 'u1')).toEqual(['reminders', 'activity', 'a1', 'u1']);
    expect(reminderKeys.upcoming('u1')).toEqual(['reminders', 'upcoming', 'u1']);
  });
});

describe('useActivityReminders', () => {
  it('consulta los de esa actividad para ese usuario', async () => {
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useActivityReminders('a1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith('a1', 'u1');
  });

  it('sin actividad no consulta', async () => {
    const { Wrapper } = crearWrapper();
    await renderHook(() => useActivityReminders(undefined), { wrapper: Wrapper });

    expect(mockList).not.toHaveBeenCalled();
  });

  it('sin sesion tampoco', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();
    await renderHook(() => useActivityReminders('a1'), { wrapper: Wrapper });

    expect(mockList).not.toHaveBeenCalled();
  });
});

describe('useReminderMutations', () => {
  it('definir offsets pasa actividad, usuario y lista', async () => {
    mockSet.mockResolvedValue([]);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useReminderMutations(), { wrapper: Wrapper });

    await result.current.setForActivity.mutateAsync({ activityId: 'a1', offsets: [10, 60] });

    expect(mockSet).toHaveBeenCalledWith('a1', 'u1', [10, 60]);
  });

  it('silenciar uno pasa el recordatorio y el usuario', async () => {
    mockSetEnabled.mockResolvedValue(undefined);
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useReminderMutations(), { wrapper: Wrapper });

    await result.current.setEnabled.mutateAsync({ reminderId: 'r1', enabled: false });

    expect(mockSetEnabled).toHaveBeenCalledWith('r1', 'u1', false);
  });

  it('cualquier cambio invalida toda la familia', async () => {
    mockSet.mockResolvedValue([]);
    const { Wrapper, queryClient } = crearWrapper();
    const espia = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = await renderHook(() => useReminderMutations(), { wrapper: Wrapper });

    await result.current.setForActivity.mutateAsync({ activityId: 'a1', offsets: [] });

    expect(espia).toHaveBeenCalledWith({ queryKey: reminderKeys.all });
  });
});

describe('useUpcomingReminders', () => {
  it('pide los del horizonte configurado', async () => {
    const { Wrapper } = crearWrapper();
    const { result } = await renderHook(() => useUpcomingReminders(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpcoming).toHaveBeenCalledWith('u1', 90);
  });

  it('sin sesion no consulta', async () => {
    mockUserId = null;
    const { Wrapper } = crearWrapper();
    await renderHook(() => useUpcomingReminders(), { wrapper: Wrapper });

    expect(mockUpcoming).not.toHaveBeenCalled();
  });
});

describe('useReminderSync (plan §3.4)', () => {
  /**
   * El espia llama al original y NO se restaura: `mockRestore` devolveria el
   * mock de jest-expo, que no entrega suscripcion, y el hook llama a `remove()`
   * al desmontar. Dentro de un archivo de pruebas dejarlo puesto es inocuo.
   */
  const espiaAppState = jest.spyOn(AppState, 'addEventListener');

  it('reprograma las notificaciones con lo que hay', async () => {
    mockUpcoming.mockResolvedValue([proximo()]);
    const { Wrapper } = crearWrapper();

    await renderHook(() => useReminderSync(), { wrapper: Wrapper });

    await waitFor(() => expect(mockSync).toHaveBeenCalled());
    expect(mockSync.mock.calls[0][0]).toHaveLength(1);
  });

  it('no reprograma si el contenido no cambio, aunque se vuelva a renderizar', async () => {
    mockUpcoming.mockResolvedValue([proximo()]);
    const { Wrapper } = crearWrapper();
    const { rerender } = await renderHook(() => useReminderSync(), { wrapper: Wrapper });

    await waitFor(() => expect(mockSync).toHaveBeenCalledTimes(1));

    await rerender(undefined);
    await rerender(undefined);

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('se suscribe al cambio de primer plano para refrescar', async () => {
    espiaAppState.mockClear();
    const { Wrapper } = crearWrapper();

    await renderHook(() => useReminderSync(), { wrapper: Wrapper });

    expect(espiaAppState).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('sin recordatorios no programa nada', async () => {
    mockUpcoming.mockResolvedValue([]);
    const { Wrapper } = crearWrapper();

    await renderHook(() => useReminderSync(), { wrapper: Wrapper });

    await waitFor(() => expect(mockSync).toHaveBeenCalled());
    expect(mockSync.mock.calls[0][0]).toEqual([]);
  });
});
