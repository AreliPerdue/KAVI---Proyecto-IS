/**
 * Hoja de detalle de actividad (RF-C7, RF-C8, spec 07).
 *
 * La regla central: sobre una actividad recurrente, editar o eliminar preguntan
 * antes si aplica a esa ocurrencia o a toda la serie. Sobre una suelta actuan
 * directo. Confundirlo borraria series completas por accidente.
 *
 * Y una regla de privacidad: los entrenamientos son del dueno. Quien recibe la
 * actividad compartida no ve ni crea el suyo.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockRemove = { mutate: jest.fn(), isPending: false };
const mockCrearActividad = { mutate: jest.fn() };
const mockSetEnabled = { mutate: jest.fn() };
const mockCrearWorkout = { mutate: jest.fn() };
const mockQuitarShare = { mutate: jest.fn() };

let mockActividad: Record<string, unknown>;
let mockRecordatorios: Record<string, unknown>;
let mockWorkout: Record<string, unknown>;
let mockUserId = 'u1';

jest.mock('@/hooks/use-activity', () => ({
  useActivity: () => mockActividad,
  useActivityMutations: () => ({ remove: mockRemove, create: mockCrearActividad, update: { mutate: jest.fn() } }),
}));
jest.mock('@/hooks/use-reminders', () => ({
  useActivityReminders: () => mockRecordatorios,
  useReminderMutations: () => ({ setEnabled: mockSetEnabled, setForActivity: { mutate: jest.fn() } }),
}));
let mockInvitados: { data: unknown[] } = { data: [] };
jest.mock('@/hooks/use-shares', () => ({
  useActivityShares: () => mockInvitados,
  useShareMutations: () => ({ remove: mockQuitarShare, share: { mutate: jest.fn() }, respond: { mutate: jest.fn() } }),
}));
jest.mock('@/hooks/use-workouts', () => ({
  useWorkoutByActivity: () => mockWorkout,
  useWorkoutMutations: () => ({ create: mockCrearWorkout, addExercise: { mutateAsync: jest.fn() } }),
}));
jest.mock('@/providers', () => ({
  useConfirm: () => mockConfirm,
  useSnackbar: () => mockSnackbar,
  useAuth: () => ({ userId: mockUserId }),
}));
jest.mock('@/components/calendar', () => ({ activityColor: () => '#4CAF50' }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/activity/[id]').default as () => React.ReactElement;

const ACTIVIDAD = (over = {}) => ({
  id: 'a1', owner_id: 'u1', title: 'Junta de equipo', description: null,
  start_at: new Date(2026, 8, 7, 9).toISOString(), end_at: new Date(2026, 8, 7, 10).toISOString(),
  all_day: false, is_gym: false, recurrence_rule: null, recurrence_parent_id: null,
  theme_id: null, dimension: null, color: null, icon: null, ...over,
});

beforeEach(() => {
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  for (const m of [mockRemove, mockCrearActividad, mockSetEnabled, mockCrearWorkout, mockQuitarShare]) m.mutate.mockReset();
  mockRemove.isPending = false;
  mockUserId = 'u1';
  mockActividad = { data: ACTIVIDAD(), isPending: false, isError: false, error: null, refetch: jest.fn() };
  mockRecordatorios = { data: [] };
  mockWorkout = { data: null };
  globalThis.setParametrosDeRuta({ id: 'a1' });
});

describe('contenido', () => {
  it('muestra el titulo de la actividad', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Junta de equipo')).toBeTruthy();
  });

  it('muestra el dia y el rango de horas', async () => {
    await render(<Pantalla />);
    expect(screen.getByText(/lunes 7 de septiembre/i)).toBeTruthy();
    expect(screen.getByText(/09:00 – 10:00/)).toBeTruthy();
  });

  it('en una actividad de todo el dia no muestra horas', async () => {
    mockActividad = { ...mockActividad, data: ACTIVIDAD({ all_day: true }) };
    await render(<Pantalla />);

    expect(screen.getByText('Todo el día')).toBeTruthy();
  });

  it('mientras carga lo indica', async () => {
    mockActividad = { ...mockActividad, data: undefined, isPending: true };
    await render(<Pantalla />);

    expect(screen.getByText('Cargando…')).toBeTruthy();
  });

  it('si ya no existe ofrece reintentar', async () => {
    const refetch = jest.fn();
    mockActividad = { data: undefined, isPending: false, isError: true, error: new Error('Esta actividad ya no existe.'), refetch };
    await render(<Pantalla />);

    expect(screen.getByText('Esta actividad ya no existe.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('acciones del dueno', () => {
  it('ofrece editar, compartir y eliminar', async () => {
    await render(<Pantalla />);

    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Compartir' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeTruthy();
  });

  it('compartir navega a su pantalla', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Compartir' }));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(app)/activity/share', params: { id: 'a1' },
    });
  });

  it('editar una actividad suelta va directo al formulario', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Editar' }));

    await waitFor(() => expect(globalThis.mockRouter.push).toHaveBeenCalled());
    expect(screen.queryByText(/toda la serie/i)).toBeNull();
  });
});

describe('recurrencia: solo esta o toda la serie (RF-C8)', () => {
  beforeEach(() => {
    mockActividad = { ...mockActividad, data: ACTIVIDAD({ recurrence_rule: 'FREQ=DAILY' }) };
  });

  it('editar una serie pregunta primero el alcance', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Editar' }));

    await waitFor(() => expect(screen.getByText(/¿solo esta ocurrencia o toda la serie\?/i)).toBeTruthy());
    expect(globalThis.mockRouter.push).not.toHaveBeenCalled();
  });

  it('eliminar una serie tambien pregunta', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(screen.getByText(/¿solo esta ocurrencia o toda la serie\?/i)).toBeTruthy());
    expect(mockRemove.mutate).not.toHaveBeenCalled();
  });

  it('elegir "solo esta" aplica ese alcance', async () => {
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: 'Editar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Solo esta ocurrencia' })).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'Solo esta ocurrencia' }));

    await waitFor(() => expect(globalThis.mockRouter.push).toHaveBeenCalled());
    const params = globalThis.mockRouter.push.mock.calls[0][0].params;
    expect(params.scope).toBe('this');
  });

  it('una actividad recurrente se anuncia como tal', async () => {
    await render(<Pantalla />);
    expect(screen.getByText(/cada día/i)).toBeTruthy();
  });
});

describe('eliminar', () => {
  it('pide confirmacion', async () => {
    mockConfirm.mockResolvedValue(false);
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockRemove.mutate).not.toHaveBeenCalled();
  });

  it('al confirmar elimina con el alcance correspondiente', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => expect(mockRemove.mutate).toHaveBeenCalled());
    expect(mockRemove.mutate.mock.calls[0][0]).toMatchObject({ id: 'a1', scope: 'this' });
  });
});

describe('actividad de otra persona', () => {
  beforeEach(() => {
    mockUserId = 'u2';
    mockActividad = { ...mockActividad, data: ACTIVIDAD({ owner_id: 'u1', owner_name: 'Areli' }) };
  });

  it('no ofrece editar ni eliminar', async () => {
    await render(<Pantalla />);

    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  });

  it('ofrece salirse de la actividad', async () => {
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: 'Salir de esta actividad' })).toBeTruthy();
  });
});

describe('entrenamiento (privado del dueno)', () => {
  it('una actividad de gimnasio propia ofrece su entrenamiento', async () => {
    mockActividad = { ...mockActividad, data: ACTIVIDAD({ is_gym: true }) };
    await render(<Pantalla />);

    expect(screen.getByText(/entrenamiento/i)).toBeTruthy();
  });

  it('una actividad normal no lo ofrece', async () => {
    await render(<Pantalla />);
    expect(screen.queryByText(/registrar entrenamiento/i)).toBeNull();
  });
});

describe('recordatorios', () => {
  it('lista los definidos y permite silenciar el propio', async () => {
    mockRecordatorios = { data: [{ id: 'r1', offset_minutes: 10, enabled: true }] };
    await render(<Pantalla />);

    expect(screen.getByText(/10 min antes/i)).toBeTruthy();

    await fireEvent.press(screen.getByRole('switch'));

    expect(mockSetEnabled.mutate.mock.calls[0][0]).toMatchObject({ reminderId: 'r1', enabled: false });
  });

  it('sin recordatorios no pinta interruptores', async () => {
    await render(<Pantalla />);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});


/**
 * Lista de invitados con su respuesta (RF-S19).
 *
 * Se agrupa por respuesta y no por orden de invitación porque la pregunta que se
 * hace quien organiza es «¿cuántos vienen?», no «¿a quién invité?».
 */
describe('quien viene', () => {
  const invitado = (id: string, nombre: string, status: string) => ({
    id, shared_with_id: id, status,
    profile: { id, display_name: nombre, username: id },
  });

  const conInvitados = async (lista: ReturnType<typeof invitado>[]) => {
    mockInvitados = { data: lista };
    globalThis.setParametrosDeRuta({ id: 'a1' });
    await render(<Pantalla />);
  };

  it('sin invitados no pinta la seccion', async () => {
    await conInvitados([]);
    expect(screen.queryByText(/invitados/i)).toBeNull();
  });

  it('cuenta cuantos han confirmado sobre el total', async () => {
    await conInvitados([
      invitado('u2', 'Ana Ruiz', 'accepted'),
      invitado('u3', 'Luis Mena', 'maybe'),
      invitado('u4', 'Pedro Ruiz', 'pending'),
    ]);
    expect(screen.getByText(/1 de 3 confirmados/i)).toBeTruthy();
  });

  it('agrupa por respuesta', async () => {
    await conInvitados([
      invitado('u2', 'Ana Ruiz', 'accepted'),
      invitado('u3', 'Luis Mena', 'maybe'),
      invitado('u4', 'Pedro Ruiz', 'declined'),
      invitado('u5', 'María Sol', 'pending'),
    ]);
    expect(screen.getByText('Van:')).toBeTruthy();
    expect(screen.getByText('Tal vez:')).toBeTruthy();
    expect(screen.getByText('No van:')).toBeTruthy();
    expect(screen.getByText('Sin responder:')).toBeTruthy();
  });

  it('un grupo vacio no se pinta', async () => {
    await conInvitados([invitado('u2', 'Ana Ruiz', 'accepted')]);
    expect(screen.queryByText('No van:')).toBeNull();
  });

  it('usa el nombre de pila, que es como se nombra en toda la app', async () => {
    await conInvitados([invitado('u2', 'María Fernanda Sol', 'accepted')]);
    expect(screen.getByText('María')).toBeTruthy();
  });
});
