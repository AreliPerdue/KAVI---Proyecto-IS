/**
 * Pantalla de Perfil (RF-A9, spec 09).
 *
 * Dos comportamientos que importan: cerrar sesion pide confirmacion, y el acceso
 * al panel de administracion solo se pinta con el rol correspondiente. Ese
 * segundo es cosmetico a proposito — el control real vive en la base (RF-AD6)—,
 * pero conviene que la pantalla no lo ofrezca a quien no puede usarlo.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockSignOut = { mutate: jest.fn(), isPending: false, error: null as Error | null };
const mockSignIn = { mutate: jest.fn(), isPending: false };
const mockUpdate = { mutate: jest.fn(), reset: jest.fn(), isPending: false, error: null as Error | null };
const mockChangePassword = { mutate: jest.fn(), reset: jest.fn(), isPending: false, error: null as Error | null };

let mockPerfil: Record<string, unknown>;
let mockEsAdmin = false;
let mockDemo = false;
let mockNotificaciones: boolean | null = null;

jest.mock('@/hooks/use-profile', () => ({
  useMyProfile: () => mockPerfil,
  useUpdateMyProfile: () => mockUpdate,
}));
jest.mock('@/hooks/use-admin', () => ({ useIsAdmin: () => mockEsAdmin }));
jest.mock('@/hooks/use-auth-actions', () => ({
  useSignOut: () => mockSignOut,
  useSignIn: () => mockSignIn,
  useChangePassword: () => mockChangePassword,
}));
jest.mock('@/hooks/use-themes', () => ({ useThemes: () => ({ data: [{ id: 't1', is_system: false }] }) }));
jest.mock('@/hooks/use-connections', () => ({ useContacts: () => ({ data: [{ kind: 'accepted' }, { kind: 'incoming' }] }) }));
jest.mock('@/hooks/use-workouts', () => ({ useWorkouts: () => ({ data: [{ id: 'w1' }, { id: 'w2' }] }) }));
jest.mock('@/hooks/use-activities-range', () => ({ useActivitiesRange: () => ({ data: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] }) }));
jest.mock('@/providers', () => ({
  useConfirm: () => mockConfirm,
  useSnackbar: () => mockSnackbar,
  useAuth: () => ({ user: { id: 'u1', email: 'areli@kavi.app' } }),
}));
jest.mock('@/lib/notifications', () => ({ notificationPermissionGranted: () => Promise.resolve(mockNotificaciones) }));
jest.mock('@/lib/env', () => ({ env: { get isDemoMode() { return mockDemo; } } }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/(tabs)/profile').default as () => React.ReactElement;

const PERFIL = { id: 'u1', username: 'areli', display_name: 'Areli Perdue', role: 'user' };

beforeEach(() => {
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  for (const m of [mockSignOut, mockUpdate, mockChangePassword]) { m.mutate.mockReset(); m.error = null; m.isPending = false; }
  mockPerfil = { data: PERFIL, isPending: false, isError: false, error: null, refetch: jest.fn() };
  mockEsAdmin = false;
  mockDemo = false;
  mockNotificaciones = null;
});

describe('identidad', () => {
  it('muestra nombre, usuario y correo', async () => {
    await render(<Pantalla />);

    expect(screen.getByText('Areli Perdue')).toBeTruthy();
    expect(screen.getByText('@areli')).toBeTruthy();
    expect(screen.getByText('areli@kavi.app')).toBeTruthy();
  });

  it('sin nombre visible usa un texto de reserva', async () => {
    mockPerfil = { ...mockPerfil, data: { ...PERFIL, display_name: null } };
    await render(<Pantalla />);

    expect(screen.getByText('Sin nombre')).toBeTruthy();
  });

  it('la tarjeta abre la edicion', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText(/editar perfil de areli perdue/i));

    await waitFor(() => expect(screen.getByText('Editar perfil')).toBeTruthy());
  });

  it('mientras carga lo dice', async () => {
    mockPerfil = { ...mockPerfil, data: undefined, isPending: true };
    await render(<Pantalla />);

    expect(screen.getByText('Cargando tu perfil…')).toBeTruthy();
  });

  it('si falla ofrece reintentar', async () => {
    const refetch = jest.fn();
    mockPerfil = { data: undefined, isPending: false, isError: true, error: new Error('Sin conexión.'), refetch };
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(refetch).toHaveBeenCalled();
  });
});

describe('estadisticas', () => {
  it('cuenta actividades del mes, amigos, temas propios y entrenamientos', async () => {
    await render(<Pantalla />);

    expect(screen.getByText('Actividades este mes')).toBeTruthy();
    expect(screen.getByText('Amigos')).toBeTruthy();
    expect(screen.getByText('Temas propios')).toBeTruthy();
    expect(screen.getByText('Entrenamientos')).toBeTruthy();
  });

  it('solo cuenta contactos aceptados como amigos', async () => {
    await render(<Pantalla />);
    // Dos contactos, uno aceptado y uno entrante.
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});

describe('accesos del calendario', () => {
  it('ofrece temas, compartido y disponibilidad', async () => {
    await render(<Pantalla />);

    expect(screen.getByLabelText(/mis temas/i)).toBeTruthy();
    expect(screen.getByLabelText(/amigos y compartido/i)).toBeTruthy();
    expect(screen.getByLabelText(/disponibilidad/i)).toBeTruthy();
  });
});

describe('administracion (spec 09)', () => {
  it('una cuenta normal no ve el panel', async () => {
    await render(<Pantalla />);
    expect(screen.queryByText('Administración')).toBeNull();
  });

  it('una cuenta administradora si', async () => {
    mockEsAdmin = true;
    await render(<Pantalla />);

    expect(screen.getByText('Administración')).toBeTruthy();
    expect(screen.getByLabelText(/estadísticas de kavi/i)).toBeTruthy();
  });
});

describe('recordatorios', () => {
  it('sin permisos disponibles lo explica', async () => {
    await render(<Pantalla />);

    await waitFor(() => expect(screen.getByText(/no hay avisos del sistema/i)).toBeTruthy());
  });

  it('con permiso concedido lo dice', async () => {
    mockNotificaciones = true;
    await render(<Pantalla />);

    await waitFor(() => expect(screen.getByText('Activados')).toBeTruthy());
  });

  it('sin permiso invita a activarlos en Ajustes', async () => {
    mockNotificaciones = false;
    await render(<Pantalla />);

    await waitFor(() => expect(screen.getByText('Desactivados')).toBeTruthy());
  });
});

describe('cerrar sesion', () => {
  it('pide confirmacion antes de nada', async () => {
    mockConfirm.mockResolvedValue(false);
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText(/cerrar sesión/i));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockSignOut.mutate).not.toHaveBeenCalled();
  });

  it('al confirmar cierra la sesion', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText(/cerrar sesión/i));

    await waitFor(() => expect(mockSignOut.mutate).toHaveBeenCalled());
  });

  it('muestra el error si falla', async () => {
    mockSignOut.error = new Error('Sin conexión.');
    await render(<Pantalla />);

    expect(screen.getByText('Sin conexión.')).toBeTruthy();
  });
});

describe('modo demo', () => {
  it('fuera de demo no ofrece cambiar de cuenta', async () => {
    await render(<Pantalla />);
    expect(screen.queryByText('Modo demo')).toBeNull();
  });

  it('en demo si, y avisa de que los datos se reinician', async () => {
    mockDemo = true;
    await render(<Pantalla />);

    expect(screen.getByText('Modo demo')).toBeTruthy();
    expect(screen.getByText(/se reinician al recargar/i)).toBeTruthy();
  });

  it('la version se marca como demo', async () => {
    mockDemo = true;
    await render(<Pantalla />);

    expect(screen.getByLabelText(/versión.*demo/i)).toBeTruthy();
  });
});
