/**
 * Pantalla de Fitness: historial y entrenamiento libre (RF-F2, RF-F7).
 *
 * El historial mezcla dos cosas que se cuentan distinto: las sesiones ligadas a una
 * actividad del calendario, que llevan su titulo, y las libres, que no tienen ninguno.
 * Y "entrenamiento libre" no navega a secas: crea primero el registro y solo entra si
 * el backend responde, porque si no dejaria una pantalla de detalle sin nada detras.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import FitnessScreen from '@/app/(app)/(tabs)/fitness';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Workout } from '@/types/domain';

const entreno = (over: Partial<Workout> = {}): Workout =>
  ({
    id: 'w1', user_id: 'u1', activity_id: null, activity_title: null, title: null,
    performed_at: new Date(2026, 8, 7, 18, 30).toISOString(),
    duration_minutes: null, notes: null, exercise_count: 3, created_at: 'x',
    ...over,
  }) as Workout;

type Consulta = { data?: Workout[]; isPending: boolean; isError: boolean; isSuccess: boolean; error?: Error; refetch: jest.Mock };

const consulta = (over: Partial<Consulta> = {}): Consulta => ({
  data: [], isPending: false, isError: false, isSuccess: true, refetch: jest.fn(), ...over,
});

let mockWorkouts: Consulta = consulta();
const mockCreate = { mutate: jest.fn(), isPending: false };
const mockCrearActividad = { mutate: jest.fn(), isPending: false };

jest.mock('@/hooks/use-workouts', () => ({
  useWorkouts: () => mockWorkouts,
  useWorkoutMutations: () => ({ create: mockCreate }),
}));
jest.mock('@/hooks/use-activity', () => ({ useActivityMutations: () => ({ create: mockCrearActividad }) }));

beforeEach(() => {
  mockWorkouts = consulta();
  mockCreate.mutate.mockReset();
  mockCreate.isPending = false;
  mockCrearActividad.mutate.mockReset();
  mockCrearActividad.isPending = false;
  globalThis.mockRouter.push.mockClear();
  usePreferencesStore.setState({ lastWorkoutTitle: null });
});

describe('estados de carga', () => {
  it('mientras carga no muestra la lista', async () => {
    mockWorkouts = consulta({ data: undefined, isPending: true, isSuccess: false });
    await render(<FitnessScreen />);
    expect(screen.queryByText(/aún no registras/i)).toBeNull();
  });

  it('si falla explica que paso y deja reintentar', async () => {
    const refetch = jest.fn();
    mockWorkouts = consulta({ data: undefined, isError: true, isSuccess: false, error: new Error('Sin conexión'), refetch });
    await render(<FitnessScreen />);

    expect(screen.getByText('Sin conexión')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('sin entrenamientos invita a empezar', async () => {
    await render(<FitnessScreen />);
    expect(screen.getByText(/aún no registras entrenamientos/i)).toBeTruthy();
  });
});

describe('historial', () => {
  it('un nombre propio gana sobre el titulo de la actividad (RF-F7)', async () => {
    mockWorkouts = consulta({ data: [entreno({ title: 'Empuje A', activity_title: 'Gimnasio' })] });
    await render(<FitnessScreen />);
    expect(screen.getByLabelText(/^Empuje A, /)).toBeTruthy();
  });

  it('sin nombre propio se usa el de la actividad', async () => {
    mockWorkouts = consulta({ data: [entreno({ title: null, activity_title: 'Gimnasio' })] });
    await render(<FitnessScreen />);
    expect(screen.getByLabelText(/^Gimnasio, /)).toBeTruthy();
  });

  it('sin ninguno de los dos queda el texto de reserva', async () => {
    mockWorkouts = consulta({ data: [entreno({ title: null, activity_title: null })] });
    await render(<FitnessScreen />);
    expect(screen.getByLabelText(/^Entrenamiento libre, /)).toBeTruthy();
  });

  it('una sesion ligada a una actividad lleva su titulo', async () => {
    mockWorkouts = consulta({ data: [entreno({ activity_title: 'Pierna' })] });
    await render(<FitnessScreen />);
    expect(screen.getByText('Pierna')).toBeTruthy();
  });

  it('una sesion sin actividad se llama entrenamiento libre', async () => {
    mockWorkouts = consulta({ data: [entreno({ activity_title: null })] });
    await render(<FitnessScreen />);
    // El boton de arriba se llama igual, asi que se busca la fila por su etiqueta.
    expect(screen.getByLabelText(/^Entrenamiento libre, /)).toBeTruthy();
  });

  it('un solo ejercicio se dice en singular', async () => {
    mockWorkouts = consulta({ data: [entreno({ exercise_count: 1 })] });
    await render(<FitnessScreen />);
    expect(screen.getByText(/1 ejercicio(?!s)/)).toBeTruthy();
  });

  it('varios, en plural', async () => {
    mockWorkouts = consulta({ data: [entreno({ exercise_count: 4 })] });
    await render(<FitnessScreen />);
    expect(screen.getByText(/4 ejercicios/)).toBeTruthy();
  });

  it('sin cuenta de ejercicios se muestra cero, no un hueco', async () => {
    // La cuenta la agrega la consulta al listar; puede no venir.
    mockWorkouts = consulta({ data: [entreno({ exercise_count: undefined })] });
    await render(<FitnessScreen />);
    expect(screen.getByText(/0 ejercicios/)).toBeTruthy();
  });

  it('la duracion solo aparece si se registro', async () => {
    mockWorkouts = consulta({ data: [entreno({ duration_minutes: 45 })] });
    await render(<FitnessScreen />);
    expect(screen.getByText(/45 min/)).toBeTruthy();
  });

  it('sin duracion no se inventa un cero', async () => {
    mockWorkouts = consulta({ data: [entreno({ duration_minutes: null })] });
    await render(<FitnessScreen />);
    expect(screen.queryByText(/ min/)).toBeNull();
  });

  it('cada fila se anuncia con titulo, fecha y numero de ejercicios', async () => {
    mockWorkouts = consulta({ data: [entreno({ activity_title: 'Pierna', exercise_count: 3 })] });
    await render(<FitnessScreen />);
    expect(screen.getByLabelText(/^Pierna, .*, 3 ejercicios$/)).toBeTruthy();
  });

  it('tocar una fila la abre en modo lectura', async () => {
    mockWorkouts = consulta({ data: [entreno({ id: 'w9', activity_title: 'Pierna' })] });
    await render(<FitnessScreen />);

    await fireEvent.press(screen.getByLabelText(/^Pierna/));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(app)/workout/[id]',
      params: { id: 'w9', mode: 'view' },
    });
  });
});

describe('entrenamiento libre', () => {
  /**
   * RF-F10: haber entrenado es un hecho del dia, asi que el entrenamiento libre
   * crea tambien su actividad de gimnasio y queda visible en el calendario.
   */
  it('crea primero la actividad de gimnasio', async () => {
    await render(<FitnessScreen />);

    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    expect(mockCrearActividad.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ is_gym: true, all_day: false }),
      expect.any(Object),
    );
    // El entrenamiento no se crea hasta que la actividad existe.
    expect(mockCreate.mutate).not.toHaveBeenCalled();
  });

  it('la actividad dura una hora', async () => {
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    const [entrada] = mockCrearActividad.mutate.mock.calls[0];
    const minutos = (Date.parse(entrada.end_at) - Date.parse(entrada.start_at)) / 60000;
    expect(minutos).toBe(60);
  });

  it('sin nombre previo la actividad se llama Entrenamiento', async () => {
    usePreferencesStore.getState().setLastWorkoutTitle(null);
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    expect(mockCrearActividad.mutate.mock.calls[0][0].title).toBe('Entrenamiento');
  });

  it('con nombre previo la actividad lo usa', async () => {
    usePreferencesStore.getState().setLastWorkoutTitle('Pierna');
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    expect(mockCrearActividad.mutate.mock.calls[0][0].title).toBe('Pierna');
  });

  it('el entrenamiento queda ligado a la actividad creada', async () => {
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    const [, opciones] = mockCrearActividad.mutate.mock.calls[0];
    opciones.onSuccess({ id: 'act-1' });

    expect(mockCreate.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ activity_id: 'act-1' }),
      expect.any(Object),
    );
  });

  /** Navegar antes de la respuesta abriria un detalle sin entrenamiento detras. */
  /** Quien entrena repite rutina: no tiene que reescribir el nombre cada vez. */
  it('el entrenamiento se estrena con el nombre del anterior', async () => {
    usePreferencesStore.getState().setLastWorkoutTitle('Pierna');
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByText('Entrenamiento libre'));
    mockCrearActividad.mutate.mock.calls[0][1].onSuccess({ id: 'act-1' });

    expect(mockCreate.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Pierna' }),
      expect.any(Object),
    );
  });

  it('solo entra al detalle cuando el backend confirma', async () => {
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByText('Entrenamiento libre'));
    mockCrearActividad.mutate.mock.calls[0][1].onSuccess({ id: 'act-1' });
    expect(globalThis.mockRouter.push).not.toHaveBeenCalled();

    const [, opciones] = mockCreate.mutate.mock.calls[0];
    opciones.onSuccess({ id: 'w-nuevo' });

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(app)/workout/[id]',
      params: { id: 'w-nuevo', mode: 'edit' },
    });
  });

  it('el boton se bloquea mientras se crea', async () => {
    mockCrearActividad.isPending = true;
    await render(<FitnessScreen />);
    expect(screen.getByLabelText('Entrenamiento libre').props.accessibilityState.disabled).toBe(true);
  });

  it('explica como registrar una sesion ya agendada', async () => {
    await render(<FitnessScreen />);
    expect(screen.getByText(/ábrela en el calendario/i)).toBeTruthy();
  });
});
