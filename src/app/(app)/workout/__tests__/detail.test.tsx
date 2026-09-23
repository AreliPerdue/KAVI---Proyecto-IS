/**
 * Pantalla de entrenamiento (RF-F3 a RF-F6, RF-F8).
 *
 * La pantalla se abre en captura o en lectura segun el parametro de ruta, y
 * eliminar un ejercicio ofrece deshacer: la accion es destructiva pero frecuente
 * durante una sesion, asi que en vez de confirmar cada vez se permite revertir
 * (NFR-12).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
/** Prefijo mock obligatorio: Jest eleva la fabrica de jest.mock. */
const mockMut = {
  update: { mutate: jest.fn() },
  remove: { mutate: jest.fn() },
  addExercise: { mutate: jest.fn() },
  updateExercise: { mutate: jest.fn() },
  removeExercise: { mutate: jest.fn() },
  duplicate: { mutate: jest.fn(), isPending: false },
  create: { mutate: jest.fn() },
};
let mockWorkout: Record<string, unknown>;

jest.mock('@/hooks/use-workouts', () => ({
  useWorkout: () => mockWorkout,
  useExerciseNames: () => ({ data: ['Sentadilla'] }),
  useWorkouts: () => ({ data: [] }),
  useWorkoutMutations: () => mockMut,
}));
jest.mock('@/hooks/use-activities-range', () => ({ useActivitiesRange: () => ({ data: [] }) }));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar }));
jest.mock('@/components/fitness/exercise-card', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- las fabricas de jest.mock se elevan */
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const ExerciseCard = (props: {
    exercise: { id: string; name: string };
    onDelete: (e: { id: string; name: string }) => void;
  }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, props.exercise.name),
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: `borrar ${props.exercise.name}`,
          onPress: () => props.onDelete(props.exercise),
        },
        React.createElement(Text, null, 'borrar'),
      ),
    );
  ExerciseCard.displayName = 'ExerciseCard';
  return { ExerciseCard };
});

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/workout/[id]').default as () => React.ReactElement;

const ejercicio = (over = {}) => ({
  id: 'e1', workout_id: 'w1', position: 0, name: 'Sentadilla',
  sets: 4, reps: '8', weight: '80 kg', duration_minutes: null, notes: null, ...over,
});
const ENTRENAMIENTO = (over = {}) => ({
  id: 'w1', owner_id: 'u1', activity_id: null, activity_title: null, title: null,
  performed_at: new Date(2026, 8, 7, 7, 30).toISOString(),
  notes: null, created_at: 'x', duration_minutes: null,
  exercises: [ejercicio()], ...over,
});

beforeEach(() => {
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  for (const mut of Object.values(mockMut)) mut.mutate.mockReset();
  mockWorkout = { data: ENTRENAMIENTO(), isPending: false, isError: false, error: null, refetch: jest.fn() };
  globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
});

describe('modo de apertura', () => {
  it('con mode=edit abre en captura', async () => {
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: 'Listo' })).toBeTruthy();
  });

  it('con mode=view abre en lectura y ofrece editar', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);

    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Listo' })).toBeNull();
  });

  it('desde lectura se puede pasar a edicion', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Editar' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Listo' })).toBeTruthy());
  });
});

describe('contenido', () => {
  it('lista los ejercicios', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Sentadilla')).toBeTruthy();
  });

  it('muestra la fecha del entrenamiento', async () => {
    await render(<Pantalla />);
    expect(screen.getByText(/7 sep 2026/)).toBeTruthy();
  });

  it('mientras carga lo indica', async () => {
    mockWorkout = { ...mockWorkout, data: undefined, isPending: true };
    await render(<Pantalla />);

    expect(screen.getByText('Cargando…')).toBeTruthy();
  });

  it('si ya no existe ofrece reintentar', async () => {
    const refetch = jest.fn();
    mockWorkout = { data: undefined, isPending: false, isError: true, error: new Error('Ese entrenamiento ya no existe.'), refetch };
    await render(<Pantalla />);

    expect(screen.getByText('Ese entrenamiento ya no existe.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('ejercicios', () => {
  it('se puede anadir uno', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Ejercicio' }));

    expect(mockMut.addExercise.mutate).toHaveBeenCalled();
    expect(mockMut.addExercise.mutate.mock.calls[0][0]).toMatchObject({ workoutId: 'w1' });
  });

  it('eliminar uno no pide confirmacion: ofrece deshacer (NFR-12)', async () => {
    mockMut.removeExercise.mutate.mockImplementation((_id: string, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('borrar Sentadilla'));

    expect(mockConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(mockSnackbar).toHaveBeenCalled());
    expect(mockSnackbar.mock.calls[0][0].actionLabel).toBe('Deshacer');
  });

  it('deshacer lo vuelve a crear con sus valores y su posicion', async () => {
    mockMut.removeExercise.mutate.mockImplementation((_id: string, o: { onSuccess?: () => void }) => o?.onSuccess?.());
    await render(<Pantalla />);

    await fireEvent.press(screen.getByLabelText('borrar Sentadilla'));
    await waitFor(() => expect(mockSnackbar).toHaveBeenCalled());

    mockSnackbar.mock.calls[0][0].onAction();

    expect(mockMut.addExercise.mutate.mock.calls[0][0].input).toMatchObject({
      name: 'Sentadilla', sets: 4, weight: '80 kg', position: 0,
    });
  });
});

describe('duplicar (RF-F8)', () => {
  it('se ofrece en lectura', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);

    expect(screen.getByRole('button', { name: 'Duplicar en…' })).toBeTruthy();
  });

  it('abre la hoja con la opcion de conservar valores', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Duplicar en…' }));

    await waitFor(() => expect(screen.getByText(/conservar series, reps y peso/i)).toBeTruthy());
  });

  it('permite duplicar como entrenamiento libre', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);
    await fireEvent.press(screen.getByRole('button', { name: 'Duplicar en…' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /entrenamiento libre/i })).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: /entrenamiento libre/i }));

    await waitFor(() => expect(mockMut.duplicate.mutate).toHaveBeenCalled());
    expect(mockMut.duplicate.mutate.mock.calls[0][0]).toMatchObject({ workoutId: 'w1' });
  });
});

describe('eliminar el entrenamiento', () => {
  it('pide confirmacion', async () => {
    mockConfirm.mockResolvedValue(false);
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar entrenamiento' }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockMut.remove.mutate).not.toHaveBeenCalled();
  });

  it('al confirmar lo elimina', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar entrenamiento' }));

    await waitFor(() => expect(mockMut.remove.mutate).toHaveBeenCalled());
  });
});


/**
 * Nombre propio de la sesion (RF-F7).
 *
 * El encabezado era fijo —"Entrenamiento libre"— y no se podia cambiar. Ahora es
 * un campo mas, con la misma mecanica que las notas: se guarda al salir de el. Y
 * al guardarlo se recuerda, para proponerlo en el siguiente entrenamiento.
 */
describe('nombre del entrenamiento', () => {
  it('en lectura se muestra el nombre propio', async () => {
    mockWorkout = { ...mockWorkout, data: ENTRENAMIENTO({ title: 'Empuje A' }) };
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);
    expect(screen.getByText('Empuje A')).toBeTruthy();
  });

  it('sin nombre propio se usa el de la actividad', async () => {
    mockWorkout = { ...mockWorkout, data: ENTRENAMIENTO({ title: null, activity_title: 'Gimnasio · pierna' }) };
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);
    expect(screen.getByText('Gimnasio · pierna')).toBeTruthy();
  });

  it('sin ninguno de los dos queda el texto de reserva', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    await render(<Pantalla />);
    expect(screen.getByText('Entrenamiento libre')).toBeTruthy();
  });

  it('en edicion es un campo, no un titulo fijo', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
    await render(<Pantalla />);
    expect(screen.getByLabelText('Nombre')).toBeTruthy();
  });

  it('se guarda al salir del campo', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
    await render(<Pantalla />);

    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Pierna');
    await fireEvent(screen.getByLabelText('Nombre'), 'blur');

    expect(mockMut.update.mutate).toHaveBeenCalledWith(
      { id: 'w1', patch: { title: 'Pierna' } },
      expect.any(Object),
    );
  });

  it('escribir sin salir del campo todavia no guarda', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
    await render(<Pantalla />);

    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Pierna');

    expect(mockMut.update.mutate).not.toHaveBeenCalled();
  });

  it('borrarlo lo deja sin nombre, no en cadena vacia', async () => {
    mockWorkout = { ...mockWorkout, data: ENTRENAMIENTO({ title: 'Pierna' }) };
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
    await render(<Pantalla />);

    await fireEvent.changeText(screen.getByLabelText('Nombre'), '   ');
    await fireEvent(screen.getByLabelText('Nombre'), 'blur');

    expect(mockMut.update.mutate).toHaveBeenCalledWith(
      { id: 'w1', patch: { title: null } },
      expect.any(Object),
    );
  });

  /** Sin esto cada blur dispararia una escritura aunque no se hubiera tocado nada. */
  it('salir del campo sin cambiar nada no guarda', async () => {
    mockWorkout = { ...mockWorkout, data: ENTRENAMIENTO({ title: 'Pierna' }) };
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
    await render(<Pantalla />);

    await fireEvent(screen.getByLabelText('Nombre'), 'blur');

    expect(mockMut.update.mutate).not.toHaveBeenCalled();
  });
});
