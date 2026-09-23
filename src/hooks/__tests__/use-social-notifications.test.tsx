/**
 * Avisos de solicitudes e invitaciones (RF-S17).
 *
 * Lo delicado aquí no es notificar, sino **no** notificar de más. Al abrir la app
 * las dos consultas se resuelven con todo lo que hubiera pendiente desde hace días;
 * si eso se tomara por «novedades», la persona recibiría una ráfaga de avisos de
 * cosas que ya conocía. Por eso la primera carga solo toma nota, y se notifica a
 * partir de la segunda.
 */
import { renderHook } from '@testing-library/react-native';

import { useSocialNotifications } from '@/hooks/use-social-notifications';

const mockPresentNow = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/notifications', () => ({ presentNow: (...a: unknown[]) => mockPresentNow(...a) }));

type Consulta = { data: unknown[]; isSuccess: boolean };
let mockContactos: Consulta = { data: [], isSuccess: true };
let mockInvitaciones: Consulta = { data: [], isSuccess: true };

jest.mock('@/hooks/use-connections', () => ({ useContacts: () => mockContactos }));
jest.mock('@/hooks/use-shares', () => ({ useInvitations: () => mockInvitaciones }));

const solicitud = (id: string, nombre: string | null, username = 'alguien') => ({
  kind: 'incoming',
  connection: { id },
  profile: { id: `p-${id}`, display_name: nombre, username },
});

const invitacion = (id: string, titulo: string, dueno: string, over: Record<string, unknown> = {}) => ({
  share: { id },
  activity: {
    id: `a-${id}`,
    title: titulo,
    all_day: false,
    start_at: new Date(2026, 8, 24, 19, 0).toISOString(),
    ...over,
  },
  owner: { display_name: dueno, username: 'duenno' },
});

beforeEach(() => {
  mockPresentNow.mockClear();
  mockContactos = { data: [], isSuccess: true };
  mockInvitaciones = { data: [], isSuccess: true };
});

describe('primera carga', () => {
  it('no avisa de lo que ya estaba pendiente', async () => {
    mockContactos = { data: [solicitud('c1', 'Ana Ruiz')], isSuccess: true };
    mockInvitaciones = { data: [invitacion('s1', 'Brunch', 'Pedro Lima')], isSuccess: true };

    await renderHook(() => useSocialNotifications());

    expect(mockPresentNow).not.toHaveBeenCalled();
  });

  it('mientras las consultas no han resuelto no hace nada', async () => {
    mockContactos = { data: [], isSuccess: false };
    mockInvitaciones = { data: [], isSuccess: false };

    await renderHook(() => useSocialNotifications());

    expect(mockPresentNow).not.toHaveBeenCalled();
  });
});

describe('solicitudes de contacto', () => {
  it('avisa de una que llega despues', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());

    mockContactos = { data: [solicitud('c1', 'Ana Ruiz')], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow).toHaveBeenCalledWith(
      'Nueva solicitud de contacto',
      'Ana quiere conectar contigo.',
      expect.objectContaining({ tipo: 'solicitud' }),
    );
  });

  it('usa el nombre de pila, no el completo', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockContactos = { data: [solicitud('c1', 'María Fernanda Sol')], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow.mock.calls[0][1]).toBe('María quiere conectar contigo.');
  });

  it('sin nombre visible cae al usuario', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockContactos = { data: [solicitud('c1', null, 'anaruiz')], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow.mock.calls[0][1]).toBe('anaruiz quiere conectar contigo.');
  });

  /** Refrescar la lista no puede volver a anunciar lo mismo. */
  it('no repite el aviso de una solicitud ya anunciada', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockContactos = { data: [solicitud('c1', 'Ana Ruiz')], isSuccess: true };
    await rerender(undefined);
    await rerender(undefined);

    expect(mockPresentNow).toHaveBeenCalledTimes(1);
  });

  it('avisa una vez por cada solicitud nueva', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockContactos = { data: [solicitud('c1', 'Ana'), solicitud('c2', 'Luis')], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow).toHaveBeenCalledTimes(2);
  });

  it('las solicitudes que yo envie no generan aviso', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockContactos = { data: [{ ...solicitud('c1', 'Ana'), kind: 'outgoing' }], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow).not.toHaveBeenCalled();
  });

  it('un contacto ya aceptado tampoco', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockContactos = { data: [{ ...solicitud('c1', 'Ana'), kind: 'accepted' }], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow).not.toHaveBeenCalled();
  });

  it('que desaparezca una solicitud no avisa de nada', async () => {
    mockContactos = { data: [solicitud('c1', 'Ana')], isSuccess: true };
    const { rerender } = await renderHook(() => useSocialNotifications());

    mockContactos = { data: [], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow).not.toHaveBeenCalled();
  });
});

describe('invitaciones a actividades', () => {
  it('avisa con quien invita, que actividad y cuando', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockInvitaciones = { data: [invitacion('s1', 'Brunch', 'Pedro Lima')], isSuccess: true };
    await rerender(undefined);

    const [titulo, cuerpo, datos] = mockPresentNow.mock.calls[0];
    expect(titulo).toBe('Pedro te invitó a una actividad');
    expect(cuerpo).toMatch(/^Brunch — /);
    expect(cuerpo).toMatch(/19:00/);
    expect(datos).toMatchObject({ tipo: 'invitacion', actividadId: 'a-s1' });
  });

  /** En una actividad de todo el día una hora sería ruido: no la hay. */
  it('en una actividad de todo el dia no dice la hora', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockInvitaciones = { data: [invitacion('s1', 'Viaje', 'Ana', { all_day: true })], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow.mock.calls[0][1]).not.toMatch(/\d{2}:\d{2}/);
  });

  it('no repite el aviso de una invitacion ya anunciada', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockInvitaciones = { data: [invitacion('s1', 'Brunch', 'Pedro')], isSuccess: true };
    await rerender(undefined);
    await rerender(undefined);

    expect(mockPresentNow).toHaveBeenCalledTimes(1);
  });

  it('responder una invitacion, que la saca de la lista, no avisa', async () => {
    mockInvitaciones = { data: [invitacion('s1', 'Brunch', 'Pedro')], isSuccess: true };
    const { rerender } = await renderHook(() => useSocialNotifications());

    mockInvitaciones = { data: [], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow).not.toHaveBeenCalled();
  });

  it('avisa de cada invitacion nueva por separado', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockInvitaciones = {
      data: [invitacion('s1', 'Brunch', 'Pedro'), invitacion('s2', 'Cine', 'Ana')],
      isSuccess: true,
    };
    await rerender(undefined);

    expect(mockPresentNow).toHaveBeenCalledTimes(2);
  });
});

describe('las dos fuentes juntas', () => {
  it('una solicitud y una invitacion a la vez generan dos avisos', async () => {
    const { rerender } = await renderHook(() => useSocialNotifications());
    mockContactos = { data: [solicitud('c1', 'Ana')], isSuccess: true };
    mockInvitaciones = { data: [invitacion('s1', 'Brunch', 'Pedro')], isSuccess: true };
    await rerender(undefined);

    expect(mockPresentNow).toHaveBeenCalledTimes(2);
  });
});
