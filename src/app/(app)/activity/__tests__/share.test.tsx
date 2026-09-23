/**
 * Pantalla de compartir actividad (RF-S4, RF-S16).
 *
 * Lo que la distingue de una lista de contactos cualquiera: avisa del choque de
 * horario antes de invitar. Consulta la disponibilidad de quienes comparten su
 * calendario, en el rango exacto de la actividad, para que no se invite a
 * alguien que ya esta ocupado.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockSnackbar = jest.fn();
const mockShare = { mutate: jest.fn(), isPending: false };
const mockRemove = { mutate: jest.fn() };

let mockContactos: Record<string, unknown>;
let mockShares: Record<string, unknown>;
let mockActividad: Record<string, unknown>;
let mockDisponibilidad: Record<string, unknown>;

jest.mock('@/hooks/use-connections', () => ({ useContacts: () => mockContactos }));
jest.mock('@/hooks/use-shares', () => ({
  useActivityShares: () => mockShares,
  useShareMutations: () => ({ share: mockShare, remove: mockRemove, respond: { mutate: jest.fn() } }),
}));
jest.mock('@/hooks/use-activity', () => ({ useActivity: () => mockActividad }));
jest.mock('@/hooks/use-availability', () => ({ useAvailability: () => mockDisponibilidad }));
jest.mock('@/providers', () => ({ useSnackbar: () => mockSnackbar }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/activity/share').default as () => React.ReactElement;

const contacto = (id: string, nombre: string, over = {}) => ({
  connection: { id: `c-${id}` },
  profile: { id, username: id, display_name: nombre },
  kind: 'accepted',
  theirCalendarVisibility: null,
  ...over,
});

beforeEach(() => {
  mockSnackbar.mockReset();
  mockShare.mutate.mockReset();
  mockShare.isPending = false;
  mockRemove.mutate.mockReset();
  mockContactos = { data: [contacto('u2', 'Ana Torres')], isPending: false, isSuccess: true };
  mockShares = { data: [], isPending: false };
  mockActividad = {
    data: { id: 'a1', start_at: new Date(2026, 8, 7, 19).toISOString(), end_at: new Date(2026, 8, 7, 20, 30).toISOString() },
  };
  mockDisponibilidad = { data: [] };
  globalThis.setParametrosDeRuta({ id: 'a1' });
});

describe('lista de candidatos', () => {
  it('muestra a los contactos aceptados', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Ana Torres')).toBeTruthy();
  });

  it('cuando ya se comparte con todos lo dice', async () => {
    mockShares = { data: [{ id: 's1', shared_with_id: 'u2', status: 'pending', profile: { id: 'u2', display_name: 'Ana Torres' } }], isPending: false };
    await render(<Pantalla />);

    expect(screen.getByText('Ya compartiste con todos tus contactos')).toBeTruthy();
  });

  it('no ofrece a quien ya tiene la actividad', async () => {
    mockShares = { data: [{ id: 's1', shared_with_id: 'u2', status: 'pending', profile: { id: 'u2', display_name: 'Ana Torres' } }], isPending: false };
    await render(<Pantalla />);

    // Aparece en la seccion de compartidos, no como candidata seleccionable.
    expect(screen.queryByLabelText('Ana Torres')).toBeNull();
  });

  it('sin contactos disponibles lo dice', async () => {
    mockContactos = { data: [], isPending: false, isSuccess: true };
    await render(<Pantalla />);

    expect(screen.getByText('Aún no tienes contactos')).toBeTruthy();
  });

  it('ignora las solicitudes pendientes: solo contactos aceptados', async () => {
    mockContactos = { data: [contacto('u3', 'Luis Mena', { kind: 'incoming' })], isPending: false, isSuccess: true };
    await render(<Pantalla />);

    expect(screen.queryByLabelText('Luis Mena')).toBeNull();
  });
});

describe('seleccion', () => {
  it('el boton nace deshabilitado', async () => {
    await render(<Pantalla />);

    const boton = screen.getByRole('button', { name: 'Compartir' });
    expect(boton.props.accessibilityState.disabled).toBe(true);
  });

  it('al elegir a alguien se habilita', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Ana Torres'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Compartir' }).props.accessibilityState.disabled).toBe(false),
    );
  });

  it('con varias personas el boton dice cuantas', async () => {
    mockContactos = { data: [contacto('u2', 'Ana Torres'), contacto('u3', 'Luis Mena')], isPending: false, isSuccess: true };
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Ana Torres'));
    await fireEvent.press(screen.getByLabelText('Luis Mena'));

    await waitFor(() => expect(screen.getByRole('button', { name: /compartir con 2 contactos/i })).toBeTruthy());
  });

  it('volver a tocar deselecciona', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Ana Torres'));
    await fireEvent.press(screen.getByLabelText('Ana Torres'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Compartir' }).props.accessibilityState.disabled).toBe(true),
    );
  });
});

describe('aviso de choque de horario (RF-S16)', () => {
  it('avisa si el contacto ya esta ocupado en ese rango', async () => {
    mockContactos = { data: [contacto('u2', 'Ana Torres', { theirCalendarVisibility: 'details' })], isPending: false, isSuccess: true };
    mockDisponibilidad = {
      data: [{
        user_id: 'u2', title: 'Clase de piano',
        start_at: new Date(2026, 8, 7, 19).toISOString(),
        end_at: new Date(2026, 8, 7, 20).toISOString(),
      }],
    };
    await render(<Pantalla />);

    expect(screen.getByText(/ocupado 19:00–20:00: clase de piano/i)).toBeTruthy();
  });

  it('sin titulo visible avisa solo del horario', async () => {
    mockContactos = { data: [contacto('u2', 'Ana Torres', { theirCalendarVisibility: 'busy' })], isPending: false, isSuccess: true };
    mockDisponibilidad = {
      data: [{
        user_id: 'u2', title: null,
        start_at: new Date(2026, 8, 7, 19).toISOString(),
        end_at: new Date(2026, 8, 7, 20).toISOString(),
      }],
    };
    await render(<Pantalla />);

    expect(screen.getByText(/ocupado 19:00–20:00$/i)).toBeTruthy();
  });

  it('con varios choques indica cuantos mas', async () => {
    mockContactos = { data: [contacto('u2', 'Ana Torres', { theirCalendarVisibility: 'details' })], isPending: false, isSuccess: true };
    const bloque = (h: number) => ({
      user_id: 'u2', title: 'Ocupado',
      start_at: new Date(2026, 8, 7, h).toISOString(),
      end_at: new Date(2026, 8, 7, h + 1).toISOString(),
    });
    mockDisponibilidad = { data: [bloque(19), bloque(20)] };
    await render(<Pantalla />);

    expect(screen.getByText(/y 1 más/i)).toBeTruthy();
  });

  it('sin choques no avisa nada', async () => {
    await render(<Pantalla />);
    expect(screen.queryByText(/ocupado/i)).toBeNull();
  });

  it('el aviso no impide compartir', async () => {
    mockContactos = { data: [contacto('u2', 'Ana Torres', { theirCalendarVisibility: 'details' })], isPending: false, isSuccess: true };
    mockDisponibilidad = {
      data: [{ user_id: 'u2', title: 'Piano', start_at: new Date(2026, 8, 7, 19).toISOString(), end_at: new Date(2026, 8, 7, 20).toISOString() }],
    };
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Ana Torres'));
    await fireEvent.press(screen.getByRole('button', { name: 'Compartir' }));

    await waitFor(() => expect(mockShare.mutate).toHaveBeenCalled());
  });
});

describe('compartir', () => {
  it('envia la actividad y los contactos elegidos', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Ana Torres'));
    await fireEvent.press(screen.getByRole('button', { name: 'Compartir' }));

    await waitFor(() => expect(mockShare.mutate).toHaveBeenCalled());
    expect(mockShare.mutate.mock.calls[0][0]).toEqual({ activityId: 'a1', contactUserIds: ['u2'] });
  });

  it('al lograrlo avisa y cierra', async () => {
    mockShare.mutate.mockImplementation((_v: unknown, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Ana Torres'));
    await fireEvent.press(screen.getByRole('button', { name: 'Compartir' }));

    await waitFor(() => expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Invitación enviada.' }));
    expect(globalThis.mockRouter.back).toHaveBeenCalled();
  });
});

describe('errores de carga (NFR-11)', () => {
  it('si falla la lista de contactos lo explica y deja reintentar', async () => {
    const refetch = jest.fn();
    mockContactos = { data: undefined, isPending: false, isSuccess: false, isError: true, error: new Error('Sin conexión. Revisa tu red e inténtalo de nuevo.'), refetch };
    await render(<Pantalla />);

    expect(screen.getByText(/sin conexión/i)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('no se confunde con no tener contactos', async () => {
    mockContactos = { data: undefined, isPending: false, isSuccess: false, isError: true, error: new Error('Algo salió mal.'), refetch: jest.fn() };
    await render(<Pantalla />);

    expect(screen.queryByText('Aún no tienes contactos')).toBeNull();
  });
});

describe('shares existentes', () => {
  /** La lista de invitados es lo que responde «¿quién viene?» (RF-S19). */
  it('muestra la respuesta de cada invitado', async () => {
    mockShares = {
      data: [
        { id: 's1', shared_with_id: 'u2', status: 'accepted', profile: { id: 'u2', display_name: 'Ana Torres' } },
        { id: 's2', shared_with_id: 'u3', status: 'maybe', profile: { id: 'u3', display_name: 'Luis Mena' } },
        { id: 's3', shared_with_id: 'u4', status: 'declined', profile: { id: 'u4', display_name: 'Pedro Ruiz' } },
        { id: 's4', shared_with_id: 'u5', status: 'pending', profile: { id: 'u5', display_name: 'María Sol' } },
      ],
      isPending: false,
    };
    await render(<Pantalla />);

    expect(screen.getByText('Va')).toBeTruthy();
    expect(screen.getByText('Tal vez')).toBeTruthy();
    expect(screen.getByText('No va')).toBeTruthy();
    expect(screen.getByText('Sin responder')).toBeTruthy();
  });

  it('permite revocar el acceso', async () => {
    mockShares = {
      data: [{ id: 's1', shared_with_id: 'u2', status: 'accepted', profile: { id: 'u2', display_name: 'Ana Torres' } }],
      isPending: false,
    };
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText(/dejar de compartir con ana torres/i));

    expect(mockRemove.mutate).toHaveBeenCalledWith('s1');
  });
});
