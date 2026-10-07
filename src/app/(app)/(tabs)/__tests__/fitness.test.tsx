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

let mockNotas: { data?: unknown[]; isError: boolean; error?: Error; refetch: jest.Mock } = { data: [], isError: false, refetch: jest.fn() };
jest.mock('@/hooks/use-workouts', () => ({
  useWorkouts: () => mockWorkouts,
  useWorkoutMutations: () => ({ create: mockCreate }),
  useNoteSearch: () => mockNotas,
}));
// Datos de salud: sin plataforma, como en web; Actividad tiene sus propias pruebas.
jest.mock('@/hooks/use-health', () => ({
  useHealthAvailability: () => ({ data: { status: 'web', source: null, reason: 'web' } }),
  useHealthPermissions: () => ({ data: undefined }),
  useExternalSessions: () => ({ data: [] }),
}));
/** Lo que el bento lee del historial (RF-F66). Cada prueba puede cambiarlo. */
let mockProgreso: Record<string, unknown> = {};
const progresoBase = () => ({
  sessions: [],
  catalog: new Map(),
  now: new Date(2026, 9, 7, 12, 0),
  streak: { weeks: 3, best: 5, trainedThisWeek: true, paused: null },
  achievements: [{ unlocked: true }, { unlocked: false }, { unlocked: false }],
  isPending: false,
});
jest.mock('@/hooks/use-gym-progress', () => ({
  useGymProgress: () => mockProgreso,
  useStreakDecision: () => ({ mutate: jest.fn(), isPending: false, error: null }),
}));
// La cola local y la conversión de v1 tienen sus propias pruebas; aquí solo se montan.
const mockBootstrap = jest.fn();
const mockConversion = jest.fn();
jest.mock('@/hooks/use-set-sync', () => ({ useOutboxBootstrap: () => mockBootstrap() }));
jest.mock('@/hooks/use-exercise-history', () => ({ useLegacyConversion: () => mockConversion() }));

beforeEach(() => {
  mockWorkouts = consulta();
  mockNotas = { data: [], isError: false, refetch: jest.fn() };
  mockProgreso = progresoBase();
  mockCreate.mutate.mockReset();
  mockCreate.isPending = false;
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
  it('lo crea sin ligarlo a ninguna actividad, como sesión en curso', async () => {
    await render(<FitnessScreen />);

    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    expect(mockCreate.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ activity_id: null, status: 'active' }),
      expect.any(Object),
    );
  });

  /** Quien entrena repite rutina: no tiene que reescribir el nombre cada vez. */
  it('se estrena con el nombre del entrenamiento anterior', async () => {
    usePreferencesStore.getState().setLastWorkoutTitle('Pierna');
    await render(<FitnessScreen />);

    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    expect(mockCreate.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Pierna' }),
      expect.any(Object),
    );
  });

  it('la primera vez, sin nombre previo, se crea sin nombre', async () => {
    usePreferencesStore.getState().setLastWorkoutTitle(null);
    await render(<FitnessScreen />);

    await fireEvent.press(screen.getByText('Entrenamiento libre'));

    expect(mockCreate.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: null }),
      expect.any(Object),
    );
  });

  it('solo entra al detalle cuando el backend confirma', async () => {
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByText('Entrenamiento libre'));
    expect(globalThis.mockRouter.push).not.toHaveBeenCalled();

    const [, opciones] = mockCreate.mutate.mock.calls[0];
    opciones.onSuccess({ id: 'w-nuevo' });

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(app)/workout/[id]',
      params: { id: 'w-nuevo', mode: 'edit' },
    });
  });

  it('el boton se bloquea mientras se crea', async () => {
    mockCreate.isPending = true;
    await render(<FitnessScreen />);
    expect(screen.getByLabelText('Entrenamiento libre').props.accessibilityState.disabled).toBe(true);
  });

  it('explica como registrar una sesion ya agendada', async () => {
    await render(<FitnessScreen />);
    expect(screen.getByText(/ábrela en el calendario/i)).toBeTruthy();
  });
});

describe('sesión en curso (spec 07 v2, RF-F18)', () => {
  it('ofrece retomar la sesión que quedó abierta', async () => {
    mockWorkouts = consulta({ data: [entreno({ id: 'abierta', title: 'Empuje A', status: 'active' }), entreno({ id: 'vieja' })] });
    await render(<FitnessScreen />);

    await fireEvent.press(screen.getByLabelText(/continuar la sesión en curso: empuje a/i));

    expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/workout/[id]', params: { id: 'abierta', mode: 'edit' } });
  });

  it('sin sesión abierta no hay aviso', async () => {
    mockWorkouts = consulta({ data: [entreno({ status: 'completed' })] });
    await render(<FitnessScreen />);
    expect(screen.queryByText('Sesión en curso')).toBeNull();
  });

  it('al entrar se recupera lo pendiente y se convierte lo de v1', async () => {
    await render(<FitnessScreen />);
    expect(mockBootstrap).toHaveBeenCalled();
    expect(mockConversion).toHaveBeenCalled();
  });
});

describe('bento (RF-F66)', () => {
  it('muestra la racha, los logros y el glosario', async () => {
    await render(<FitnessScreen />);
    expect(screen.getByText('3 semanas')).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByLabelText('Glosario')).toBeTruthy();
  });

  it('cuenta las sesiones de esta semana y sus músculos', async () => {
    const lunes = new Date(2026, 9, 5, 18, 0).toISOString();
    mockProgreso = {
      ...progresoBase(),
      catalog: new Map([['sentadilla', { id: 'sentadilla', tracking_type: 'weight_reps', primary_muscles: ['quads'], secondary_muscles: ['glutes_max'] }]]),
      sessions: [
        {
          id: 'w1',
          performed_at: lunes,
          bodyweight_kg: null,
          exercises: [
            {
              id: 'e1',
              exercise_id: 'sentadilla',
              workout_sets: [
                { id: 's1', set_type: 'working', completed_at: lunes, segments: [{ kind: 'main', weight_kg: 100, reps: 5 }] },
                { id: 's2', set_type: 'working', completed_at: lunes, segments: [{ kind: 'main', weight_kg: 100, reps: 5 }] },
              ],
            },
          ],
        },
      ],
    };
    await render(<FitnessScreen />);

    expect(screen.getByText('1 sesión')).toBeTruthy();
    expect(screen.getByText('1000 kg de volumen')).toBeTruthy();
    expect(screen.getByText('Cuádriceps · 2 series')).toBeTruthy();
  });

  it('sin entrenos esta semana lo dice', async () => {
    await render(<FitnessScreen />);
    expect(screen.getByText('0 sesiones')).toBeTruthy();
    expect(screen.getByText('Aún nada esta semana.')).toBeTruthy();
  });

  it('las tarjetas de racha y logros abren Progreso', async () => {
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByLabelText('Logros'));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith('/(app)/progress');
  });

  it('el glosario abre el glosario', async () => {
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByLabelText('Glosario'));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith('/(app)/glossary');
  });
});

describe('ajustes (RF-F67)', () => {
  it('el ⚙ abre los ajustes de Fitness', async () => {
    await render(<FitnessScreen />);
    await fireEvent.press(screen.getByLabelText('Ajustes de Fitness'));
    expect(globalThis.mockRouter.push).toHaveBeenCalledWith('/(app)/fitness-settings');
  });
});

describe('buscar en las notas (RF-F53)', () => {
  it('con dos letras o más, cambia el historial por las notas encontradas', async () => {
    mockWorkouts = consulta({ data: [entreno({ title: 'Pierna' })] });
    mockNotas = {
      data: [{ workout_id: 'w1', where: 'set', text: 'Cinturón en las últimas dos', performed_at: new Date(2026, 8, 28).toISOString(), title: 'Pierna', exercise_name: 'Sentadilla' }],
      isError: false,
      refetch: jest.fn(),
    };
    await render(<FitnessScreen />);

    await fireEvent.changeText(screen.getByLabelText('Buscar en tus notas'), 'cint');

    expect(screen.getByText('Cinturón en las últimas dos')).toBeTruthy();
    expect(screen.queryByText('Historial')).toBeNull();
  });

  it('el buscador sigue montado al pasar del historial a las notas (no pierde el foco)', async () => {
    await render(<FitnessScreen />);
    const antes = screen.getByLabelText('Buscar en tus notas');
    await fireEvent.changeText(antes, 'ci');
    expect(screen.getByLabelText('Buscar en tus notas')).toBe(antes);
  });

  it('si no encuentra nada lo dice', async () => {
    await render(<FitnessScreen />);
    await fireEvent.changeText(screen.getByLabelText('Buscar en tus notas'), 'xyz');
    expect(screen.getByText('Ninguna nota dice eso')).toBeTruthy();
  });
});


describe('bento: racha en pausa y unidad (RF-F58, RF-F66)', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- store del gym */
  const { useGymStore } = require('@/store/gym-store') as typeof import('@/store/gym-store');
  afterEach(() => useGymStore.setState({ weightUnit: 'kg' }));

  it('con la racha en pausa, la pregunta va arriba del mosaico', async () => {
    mockProgreso = { ...progresoBase(), streak: { weeks: 3, best: 3, trainedThisWeek: false, paused: { weeks: ['2026-09-28'] } } };
    await render(<FitnessScreen />);
    expect(screen.getByText(/¿Qué pasó\?/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mi racha sigue' })).toBeTruthy();
  });

  it('en lb, el volumen de la semana sale en lb', async () => {
    useGymStore.setState({ weightUnit: 'lb' });
    const lunes = new Date(2026, 9, 5, 18, 0).toISOString();
    mockProgreso = {
      ...progresoBase(),
      catalog: new Map([['banca', { id: 'banca', tracking_type: 'weight_reps', primary_muscles: ['chest_mid'], secondary_muscles: [] }]]),
      sessions: [
        {
          id: 'w1', performed_at: lunes, bodyweight_kg: null,
          exercises: [{ id: 'e1', exercise_id: 'banca', workout_sets: [{ id: 's1', set_type: 'working', completed_at: lunes, segments: [{ kind: 'main', weight_kg: 100, reps: 10 }] }] }],
        },
      ],
    };
    await render(<FitnessScreen />);
    expect(screen.getByText(/lb de volumen/)).toBeTruthy();
  });
});
