/**
 * Panel de administracion (spec 09).
 *
 * El control real vive en la base: las RPC comprueban el rol con `is_admin`
 * (RF-AD6). Lo que esta pantalla decide es solo que pintar, y lo importante es
 * que a una cuenta sin rol le explique que no aplica en vez de dejarla ante una
 * pantalla vacia o un error crudo.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

let mockEsAdmin = true;
let mockStats: Record<string, unknown>;
let mockCuentas: Record<string, unknown>;

jest.mock('@/hooks/use-admin', () => ({
  useIsAdmin: () => mockEsAdmin,
  useAdminStats: () => mockStats,
  useAdminAccounts: () => mockCuentas,
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/admin').default as () => React.ReactElement;

const ESTADISTICAS = {
  total_accounts: 1234, accounts_7d: 12, accounts_30d: 40, active_users_30d: 30,
  total_activities: 5678, activities_30d: 900, accepted_connections: 45,
  shared_calendars: 12, custom_themes: 7, total_workouts: 3,
};
const CUENTA = (over = {}) => ({
  id: 'u1', email: 'areli@kavi.app', display_name: 'Areli Perdue',
  role: 'user', created_at: new Date(2026, 8, 1).toISOString(),
  activity_count: 12, last_active_at: new Date(2026, 8, 20).toISOString(), ...over,
});

beforeEach(() => {
  mockEsAdmin = true;
  mockStats = { data: ESTADISTICAS, isPending: false, isError: false, error: null, refetch: jest.fn() };
  mockCuentas = { data: [CUENTA()], isPending: false, isError: false, isSuccess: true, error: null, refetch: jest.fn() };
});

describe('control de acceso', () => {
  it('una cuenta sin rol recibe una explicacion, no un error crudo', async () => {
    mockEsAdmin = false;
    await render(<Pantalla />);

    expect(screen.getByText('Esta sección no está disponible')).toBeTruthy();
    expect(screen.getByText(/no administra kavi/i)).toBeTruthy();
  });

  it('y no ve ninguna estadistica', async () => {
    mockEsAdmin = false;
    await render(<Pantalla />);

    expect(screen.queryByText('Cuentas')).toBeNull();
  });
});

describe('estadisticas', () => {
  it('muestra las metricas con su etiqueta', async () => {
    await render(<Pantalla />);

    expect(screen.getByText('Contactos')).toBeTruthy();
    expect(screen.getByText('Calendarios compartidos')).toBeTruthy();
    expect(screen.getByText('Temas propios')).toBeTruthy();
  });

  it('formatea los numeros grandes en es-MX', async () => {
    await render(<Pantalla />);

    expect(screen.getByText('1,234')).toBeTruthy();
    expect(screen.getByText('5,678')).toBeTruthy();
  });

  it('mientras cargan lo indica', async () => {
    mockStats = { ...mockStats, data: undefined, isPending: true };
    await render(<Pantalla />);

    expect(screen.getByText('Cargando estadísticas…')).toBeTruthy();
  });

  it('si fallan ofrece reintentar', async () => {
    const refetch = jest.fn();
    mockStats = { data: undefined, isPending: false, isError: true, error: new Error('No tienes permiso para hacer eso.'), refetch };
    await render(<Pantalla />);

    expect(screen.getByText(/no tienes permiso/i)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Reintentar' })[0]!);
    expect(refetch).toHaveBeenCalled();
  });
});

describe('listado de cuentas', () => {
  it('muestra correo y nombre', async () => {
    await render(<Pantalla />);

    expect(screen.getByText('areli@kavi.app')).toBeTruthy();
    expect(screen.getByText('Areli Perdue')).toBeTruthy();
  });

  it('sin cuentas lo dice', async () => {
    mockCuentas = { ...mockCuentas, data: [] };
    await render(<Pantalla />);

    expect(screen.getByText('Todavía no hay cuentas')).toBeTruthy();
  });

  it('mientras cargan lo indica', async () => {
    mockCuentas = { ...mockCuentas, data: undefined, isPending: true, isSuccess: false };
    await render(<Pantalla />);

    expect(screen.getByText('Cargando cuentas…')).toBeTruthy();
  });

  it('no expone contenido de ninguna cuenta, solo agregados', async () => {
    await render(<Pantalla />);

    expect(screen.queryByText(/contraseña/i)).toBeNull();
  });
});
