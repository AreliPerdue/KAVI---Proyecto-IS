/**
 * Aviso de recordatorio vencido en web (NFR-10).
 *
 * En web no hay notificaciones locales, asi que este banner es el unico aviso
 * que recibe la persona. Solo aparece cuando la hora del recordatorio ya paso, y
 * se puede descartar sin que reaparezca.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

let mockProximos: Record<string, unknown>;
jest.mock('@/hooks/use-reminders', () => ({ useUpcomingReminders: () => mockProximos }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras el mock */
const { DueRemindersBanner } = require('@/components/calendar/due-reminders-banner') as typeof import('@/components/calendar/due-reminders-banner');

const recordatorio = (over = {}) => ({
  reminderId: 'r1', activityId: 'a1', title: 'Junta de equipo',
  fireAt: new Date(Date.now() - 60_000).toISOString(),
  activityStartAt: new Date(2026, 8, 7, 9).toISOString(),
  body: 'x', ...over,
});

const plataformaOriginal = Platform.OS;
beforeEach(() => {
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  mockProximos = { data: [] };
});
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: plataformaOriginal, configurable: true });
});

describe('cuando aparece', () => {
  it('con un recordatorio ya vencido lo muestra', async () => {
    mockProximos = { data: [recordatorio()] };
    await render(<DueRemindersBanner />);

    expect(screen.getByText('Junta de equipo')).toBeTruthy();
  });

  it('indica a que hora empieza la actividad', async () => {
    mockProximos = { data: [recordatorio()] };
    await render(<DueRemindersBanner />);

    expect(screen.getByText('Empieza a las 09:00')).toBeTruthy();
  });

  it('un recordatorio futuro todavia no se muestra', async () => {
    mockProximos = { data: [recordatorio({ fireAt: new Date(Date.now() + 3_600_000).toISOString() })] };
    await render(<DueRemindersBanner />);

    expect(screen.queryByText('Junta de equipo')).toBeNull();
  });

  it('sin recordatorios no pinta nada', async () => {
    const r = await render(<DueRemindersBanner />);
    expect(r.toJSON()).toBeNull();
  });

  it('en nativo no aparece: ahi hay notificaciones del sistema', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockProximos = { data: [recordatorio()] };

    const r = await render(<DueRemindersBanner />);

    expect(r.toJSON()).toBeNull();
  });

  it('se anuncia a los lectores de pantalla', async () => {
    mockProximos = { data: [recordatorio()] };
    await render(<DueRemindersBanner />);

    expect(JSON.stringify(screen.toJSON())).toContain('"accessibilityLiveRegion":"polite"');
  });
});

describe('interaccion', () => {
  it('tocarlo abre la actividad', async () => {
    mockProximos = { data: [recordatorio()] };
    await render(<DueRemindersBanner />);

    await fireEvent.press(screen.getByLabelText('Abrir Junta de equipo'));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(app)/activity/[id]', params: { id: 'a1' },
    });
  });

  it('se puede descartar y no vuelve', async () => {
    mockProximos = { data: [recordatorio()] };
    await render(<DueRemindersBanner />);

    await fireEvent.press(screen.getByLabelText('Descartar recordatorio'));

    await waitFor(() => expect(screen.queryByText('Junta de equipo')).toBeNull());
  });

  it('descartar uno no descarta los demas', async () => {
    mockProximos = {
      data: [recordatorio(), recordatorio({ reminderId: 'r2', activityId: 'a2', title: 'Otra' })],
    };
    await render(<DueRemindersBanner />);

    await fireEvent.press(screen.getAllByLabelText('Descartar recordatorio')[0]!);

    await waitFor(() => expect(screen.queryByText('Junta de equipo')).toBeNull());
    expect(screen.getByText('Otra')).toBeTruthy();
  });

  it('nunca muestra mas de tres a la vez', async () => {
    mockProximos = {
      data: Array.from({ length: 5 }, (_, i) => recordatorio({ reminderId: `r${i}`, activityId: `a${i}`, title: `Aviso ${i}` })),
    };
    await render(<DueRemindersBanner />);

    expect(screen.getAllByLabelText('Descartar recordatorio')).toHaveLength(3);
  });
});
