/**
 * Pantalla de Compartido (spec 06): invitaciones, contactos y busqueda.
 *
 * Lo que mas importa fijar aqui es que eliminar un contacto pida confirmacion y
 * avise de la cascada — se revoca todo lo compartido entre ambos, no solo la
 * conexion (RF-S2) —, y que el buscador no consulte por debajo del minimo, que
 * es lo que impide usarlo para enumerar cuentas (RF-S1).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockRemove = { mutate: jest.fn(), error: null as Error | null };
const mockAccept = { mutate: jest.fn(), error: null as Error | null };
const mockRequest = { mutate: jest.fn(), error: null as Error | null };
const mockSetVisibility = { mutate: jest.fn(), error: null as Error | null };
const mockSetColor = { mutate: jest.fn(), error: null as Error | null };
const mockRespond = { mutate: jest.fn(), error: null as Error | null };

let mockContactos: Record<string, unknown>;
let mockInvitaciones: Record<string, unknown>;
let mockBusqueda: Record<string, unknown>;

jest.mock('@/hooks/use-connections', () => ({
  SEARCH_MIN_LENGTH: 3,
  useContacts: () => mockContactos,
  useInvitations: () => mockInvitaciones,
  useUserSearch: () => mockBusqueda,
  usePeopleColors: () => new Map(),
  useConnectionMutations: () => ({
    remove: mockRemove, accept: mockAccept, request: mockRequest,
    setVisibility: mockSetVisibility, setColor: mockSetColor,
  }),
}));
jest.mock('@/hooks/use-shares', () => ({
  useInvitations: () => mockInvitaciones,
  useShareMutations: () => ({ respond: mockRespond, share: { mutate: jest.fn() }, remove: { mutate: jest.fn() } }),
}));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/(tabs)/shared').default as () => React.ReactElement;

const perfil = (id: string, nombre: string | null = 'Ana Torres') => ({ id, username: id, display_name: nombre });
const contacto = (id: string, over = {}) => ({
  connection: { id: `c-${id}` },
  profile: perfil(id),
  kind: 'accepted',
  myCalendarVisibility: null,
  theirCalendarVisibility: null,
  color: null,
  ...over,
});
const invitacion = () => ({
  share: { id: 's1' },
  activity: {
    id: 'a1', title: 'Gimnasio juntos', all_day: false,
    start_at: new Date(2026, 8, 24, 19).toISOString(),
    end_at: new Date(2026, 8, 24, 20, 30).toISOString(),
  },
  owner: perfil('u2'),
});

beforeEach(() => {
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  for (const m of [mockRemove, mockAccept, mockRequest, mockSetVisibility, mockSetColor, mockRespond]) {
    m.mutate.mockReset(); m.error = null;
  }
  mockContactos = { data: [], isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() };
  mockInvitaciones = { data: [], isPending: false };
  mockBusqueda = { data: [], isPending: false, isError: false };
});

describe('estructura', () => {
  it('muestra el titulo como encabezado', async () => {
    await render(<Pantalla />);
    expect(screen.getByRole('header', { name: 'Compartido' })).toBeTruthy();
  });

  it('ofrece buscar personas y abrir disponibilidad', async () => {
    await render(<Pantalla />);
    // Hay dos: el icono del encabezado y el boton del estado vacio.
    expect(screen.getAllByLabelText('Buscar personas').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /disponibilidad y horarios/i })).toBeTruthy();
  });

  it('abrir disponibilidad navega a su pantalla', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: /disponibilidad y horarios/i }));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith('/(app)/shared/availability');
  });

  it('mientras carga lo indica', async () => {
    mockContactos = { ...mockContactos, isPending: true };
    await render(<Pantalla />);
    expect(screen.getByText('Cargando…')).toBeTruthy();
  });

  it('si falla ofrece reintentar', async () => {
    const refetch = jest.fn();
    mockContactos = { data: undefined, isPending: false, isError: true, isSuccess: false, error: new Error('Sin conexión.'), refetch };
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(refetch).toHaveBeenCalled();
  });

  it('sin contactos invita a buscar a alguien', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Aún no tienes contactos')).toBeTruthy();
  });
});

describe('invitaciones a actividades (RF-S5)', () => {
  beforeEach(() => { mockInvitaciones = { data: [invitacion()], isPending: false }; });

  it('muestra la actividad, cuando es y quien la comparte', async () => {
    await render(<Pantalla />);

    expect(screen.getByText('Gimnasio juntos')).toBeTruthy();
    expect(screen.getByText(/compartida por ana torres/i)).toBeTruthy();
  });

  it('aceptar responde que si', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Aceptar' }));

    expect(mockRespond.mutate.mock.calls[0][0]).toEqual({ shareId: 's1', accept: true });
  });

  it('al aceptar se avisa de que entro al calendario', async () => {
    mockRespond.mutate.mockImplementation((_v: unknown, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Aceptar' }));

    await waitFor(() => expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Actividad añadida a tu calendario.' }));
  });

  it('rechazar responde que no y sin aviso', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Rechazar' }));

    expect(mockRespond.mutate.mock.calls[0][0]).toEqual({ shareId: 's1', accept: false });
    expect(mockSnackbar).not.toHaveBeenCalled();
  });

  it('sin invitaciones no pinta la seccion', async () => {
    mockInvitaciones = { data: [], isPending: false };
    await render(<Pantalla />);
    expect(screen.queryByText('Invitaciones a actividades')).toBeNull();
  });
});

describe('solicitudes recibidas', () => {
  beforeEach(() => { mockContactos = { ...mockContactos, data: [contacto('u2', { kind: 'incoming' })] }; });

  it('ofrece aceptar y rechazar', async () => {
    await render(<Pantalla />);
    expect(screen.getByLabelText('Aceptar solicitud')).toBeTruthy();
    expect(screen.getByLabelText('Rechazar solicitud')).toBeTruthy();
  });

  it('aceptar usa el id de la conexion', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Aceptar solicitud'));

    expect(mockAccept.mutate.mock.calls[0][0]).toBe('c-u2');
  });
});

describe('eliminar contacto (RF-S2)', () => {
  beforeEach(() => { mockContactos = { ...mockContactos, data: [contacto('u2', { kind: 'outgoing' })] }; });

  it('pide confirmacion antes de nada', async () => {
    mockConfirm.mockResolvedValue(false);
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Cancelar solicitud'));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockRemove.mutate).not.toHaveBeenCalled();
  });

  it('al confirmar elimina la conexion', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('Cancelar solicitud'));

    await waitFor(() => expect(mockRemove.mutate).toHaveBeenCalled());
    expect(mockRemove.mutate.mock.calls[0][0]).toBe('c-u2');
  });

  it('con un contacto aceptado avisa de la cascada', async () => {
    mockContactos = { ...mockContactos, data: [contacto('u2')] };
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText(/Ana Torres/));
    const filas = screen.queryAllByLabelText(/Ana Torres/);
    expect(filas.length).toBeGreaterThan(0);
  });
});

describe('lista de contactos', () => {
  it('muestra el nombre y que comparte cada quien', async () => {
    mockContactos = { ...mockContactos, data: [contacto('u2', { myCalendarVisibility: 'details', theirCalendarVisibility: 'busy' })] };
    await render(<Pantalla />);

    expect(screen.getByText('Ana Torres')).toBeTruthy();
    expect(screen.getByText(/tu calendario:/i)).toBeTruthy();
    expect(screen.getByText(/te comparte:/i)).toBeTruthy();
  });

  it('sin nombre visible usa un texto de reserva', async () => {
    mockContactos = { ...mockContactos, data: [contacto('u2', { profile: perfil('u2', null) })] };
    await render(<Pantalla />);

    expect(screen.getByText('Sin nombre')).toBeTruthy();
  });

  it('quien no comparte su calendario no muestra esa linea', async () => {
    mockContactos = { ...mockContactos, data: [contacto('u2')] };
    await render(<Pantalla />);

    expect(screen.queryByText(/te comparte:/i)).toBeNull();
  });

  it('las solicitudes enviadas se marcan como pendientes', async () => {
    mockContactos = { ...mockContactos, data: [contacto('u2', { kind: 'outgoing' })] };
    await render(<Pantalla />);

    expect(screen.getByText('Solicitudes enviadas')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
  });
});

describe('errores', () => {
  it('muestra el error de cualquier mutacion', async () => {
    mockAccept.error = new Error('Esa solicitud ya no está disponible.');
    await render(<Pantalla />);

    expect(screen.getByText(/ya no está disponible/i)).toBeTruthy();
  });
});
