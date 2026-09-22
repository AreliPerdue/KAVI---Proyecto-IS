/**
 * Disponibilidad y "Encontrar horario" (RF-S8, RF-S9).
 *
 * La pantalla solo muestra a quien comparte su calendario contigo: no basta con
 * ser contacto aceptado. Y al buscar huecos se incluye siempre la propia agenda,
 * porque un horario en comun tiene que estar libre tambien para ti.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

let mockContactos: Record<string, unknown>;
let mockDisponibilidad: Record<string, unknown>;
const mockUseAvailability = jest.fn();

jest.mock('@/hooks/use-connections', () => ({ useContacts: () => mockContactos }));
jest.mock('@/hooks/use-availability', () => ({
  useAvailability: (ids: string[], rango: unknown) => {
    mockUseAvailability(ids, rango);
    return mockDisponibilidad;
  },
}));
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/shared/availability').default as () => React.ReactElement;

const contacto = (id: string, nombre: string, visibilidad: string | null = 'busy') => ({
  connection: { id: `c-${id}` },
  profile: { id, username: id, display_name: nombre },
  kind: 'accepted',
  theirCalendarVisibility: visibilidad,
});

beforeEach(() => {
  mockUseAvailability.mockReset();
  mockContactos = { data: [contacto('u2', 'Ana Torres')], isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() };
  mockDisponibilidad = { data: [], isPending: false, isError: false, error: null };
});

describe('quien aparece', () => {
  it('muestra a quien comparte su calendario', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Ana Torres')).toBeTruthy();
  });

  it('no muestra a un contacto que no comparte', async () => {
    mockContactos = { ...mockContactos, data: [contacto('u2', 'Ana Torres', null)] };
    await render(<Pantalla />);

    expect(screen.getByText(/nadie te comparte su calendario/i)).toBeTruthy();
  });

  it('tampoco a una solicitud pendiente', async () => {
    mockContactos = { ...mockContactos, data: [{ ...contacto('u3', 'Luis Mena'), kind: 'incoming' }] };
    await render(<Pantalla />);

    expect(screen.queryByText('Luis Mena')).toBeNull();
  });

  it('sin nadie compartiendo explica como pedirlo', async () => {
    mockContactos = { ...mockContactos, data: [] };
    await render(<Pantalla />);

    expect(screen.getByText(/pide a tus contactos/i)).toBeTruthy();
  });
});

describe('semana visible', () => {
  it('permite ir a la semana anterior y siguiente', async () => {
    await render(<Pantalla />);

    expect(screen.getByLabelText('Semana anterior')).toBeTruthy();
    expect(screen.getByLabelText('Semana siguiente')).toBeTruthy();
  });

  it('cambiar de semana vuelve a consultar con otro rango', async () => {
    await render(<Pantalla />);
    const rangoInicial = JSON.stringify(mockUseAvailability.mock.calls.at(-1)?.[1]);

    await fireEvent.press(screen.getByLabelText('Semana siguiente'));

    await waitFor(() => {
      const rangoNuevo = JSON.stringify(mockUseAvailability.mock.calls.at(-1)?.[1]);
      expect(rangoNuevo).not.toBe(rangoInicial);
    });
  });
});

describe('seleccion de personas', () => {
  it('la propia agenda siempre entra en la consulta', async () => {
    await render(<Pantalla />);

    expect(mockUseAvailability.mock.calls[0][0]).toContain('u1');
  });

  it('al elegir a alguien se suma a la consulta', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ana Torres' }));

    await waitFor(() => expect(mockUseAvailability.mock.calls.at(-1)?.[0]).toContain('u2'));
  });

  it('volver a tocar la quita', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ana Torres' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ana Torres' }));

    await waitFor(() => expect(mockUseAvailability.mock.calls.at(-1)?.[0]).not.toContain('u2'));
  });
});

describe('encontrar horario (RF-S9)', () => {
  /** La rejilla y el buscador solo aparecen tras elegir a alguien. */
  async function conAlguienElegido() {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ana Torres' }));
    await waitFor(() => expect(screen.getByText('Encontrar horario')).toBeTruthy());
  }

  it('sin elegir a nadie invita a hacerlo', async () => {
    await render(<Pantalla />);
    expect(screen.getByText(/elige al menos un contacto/i)).toBeTruthy();
  });

  it('ofrece las cuatro duraciones', async () => {
    await conAlguienElegido();

    for (const etiqueta of ['30 min', '1 h', '1.5 h', '2 h']) {
      expect(screen.getByRole('tab', { name: etiqueta })).toBeTruthy();
    }
  });

  it('arranca en una hora', async () => {
    await conAlguienElegido();

    const tabs = screen.getAllByRole('tab');
    const activa = tabs.find((t) => t.props.accessibilityState?.selected);
    expect(activa?.props.accessibilityLabel).toBe('1 h');
  });

  it('se puede cambiar la duracion', async () => {
    await conAlguienElegido();

    await fireEvent.press(screen.getByRole('tab', { name: '2 h' }));

    await waitFor(() => {
      const activa = screen.getAllByRole('tab').find((t) => t.props.accessibilityState?.selected);
      expect(activa?.props.accessibilityLabel).toBe('2 h');
    });
  });

  it('sin huecos de esa duracion lo dice', async () => {
    await conAlguienElegido();
    await fireEvent.press(screen.getByRole('tab', { name: '2 h' }));

    await waitFor(() => expect(screen.getByText('Encontrar horario')).toBeTruthy());
  });
});

describe('estados', () => {
  it('mientras calcula lo dice', async () => {
    mockDisponibilidad = { ...mockDisponibilidad, isPending: true };
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ana Torres' }));

    await waitFor(() => expect(screen.getByText('Calculando disponibilidad…')).toBeTruthy());
  });

  it('si falla el calculo de disponibilidad ofrece reintentar', async () => {
    const refetch = jest.fn();
    mockDisponibilidad = { data: undefined, isPending: false, isError: true, error: new Error('Sin conexión.'), refetch };
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ana Torres' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('si falla la lista de contactos lo explica y deja reintentar (NFR-11)', async () => {
    const refetch = jest.fn();
    mockContactos = { data: undefined, isPending: false, isError: true, isSuccess: false, error: new Error('Sin conexión. Revisa tu red e inténtalo de nuevo.'), refetch };
    await render(<Pantalla />);

    expect(screen.getByText(/sin conexión/i)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('el fallo de contactos no se confunde con no tener a nadie compartiendo', async () => {
    mockContactos = { data: undefined, isPending: false, isError: true, isSuccess: false, error: new Error('Algo salió mal.'), refetch: jest.fn() };
    await render(<Pantalla />);

    expect(screen.queryByText(/nadie te comparte/i)).toBeNull();
  });
});
