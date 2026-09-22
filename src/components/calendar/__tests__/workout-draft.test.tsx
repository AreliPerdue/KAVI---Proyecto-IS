/**
 * Captura de rutina dentro del formulario de actividad (RF-F9).
 *
 * Existe para no tener que salir al modulo de Fitness: los ejercicios se guardan
 * junto con la actividad. Es un borrador en memoria —de ahi la `key` local en vez
 * de un id de base— y si la actividad ya tiene entrenamiento se ofrece abrirlo en
 * lugar de duplicarlo.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { WorkoutDraft } from '@/components/calendar/workout-draft';
import type { ExerciseDraft } from '@/components/calendar/workout-draft';

jest.mock('@/hooks/use-workouts', () => ({ useExerciseNames: () => ({ data: ['Sentadilla'] }) }));

const borrador = (over: Partial<ExerciseDraft> = {}): ExerciseDraft =>
  ({ key: 'k1', name: 'Prensa', sets: 3, reps: '12', weight: '160 kg', duration_minutes: null, notes: null, ...over }) as ExerciseDraft;

const montar = (props: Partial<Parameters<typeof WorkoutDraft>[0]> = {}) =>
  render(<WorkoutDraft exercises={[]} onChange={jest.fn()} {...props} />);

describe('borrador vacio', () => {
  it('explica que se puede dejar para despues', async () => {
    await montar();
    expect(screen.getByText(/puedes dejarlo vacío y completarlo después/i)).toBeTruthy();
  });

  it('invita a anadir el primero', async () => {
    await montar();
    expect(screen.getByRole('button', { name: 'Añadir ejercicio' })).toBeTruthy();
  });

  it('anadir crea una tarjeta vacia', async () => {
    const onChange = jest.fn();
    await montar({ onChange });

    await fireEvent.press(screen.getByRole('button', { name: 'Añadir ejercicio' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const nuevos = onChange.mock.calls[0][0] as ExerciseDraft[];
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]?.name).toBe('');
  });

  it('cada ejercicio nuevo lleva su propia clave', async () => {
    const onChange = jest.fn();
    await montar({ exercises: [borrador()], onChange });

    await fireEvent.press(screen.getByRole('button', { name: 'Añadir otro ejercicio' }));

    const nuevos = onChange.mock.calls[0][0] as ExerciseDraft[];
    expect(nuevos[1]?.key).not.toBe(nuevos[0]?.key);
  });
});

describe('con ejercicios', () => {
  it('el boton cambia de texto', async () => {
    await montar({ exercises: [borrador()] });
    expect(screen.getByRole('button', { name: 'Añadir otro ejercicio' })).toBeTruthy();
  });

  it('muestra los valores del borrador', async () => {
    await montar({ exercises: [borrador()] });

    expect(screen.getByLabelText('Nombre', { includeHiddenElements: true }).props.value).toBe('Prensa');
    expect(screen.getByLabelText('Series', { includeHiddenElements: true }).props.value).toBe('3');
  });

  it('editar un campo actualiza solo ese ejercicio', async () => {
    const onChange = jest.fn();
    const dos = [borrador(), borrador({ key: 'k2', name: 'Remo' })];
    await montar({ exercises: dos, onChange });

    const campos = screen.getAllByLabelText('Nombre', { includeHiddenElements: true });
    await fireEvent.changeText(campos[0]!, 'Prensa inclinada');

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const actualizados = onChange.mock.calls[0][0] as ExerciseDraft[];
    expect(actualizados[0]?.name).toBe('Prensa inclinada');
    expect(actualizados[1]?.name).toBe('Remo');
  });
});

describe('entrenamiento ya existente', () => {
  it('ofrece abrirlo en vez de capturar otro', async () => {
    const onOpenExisting = jest.fn();
    await montar({ existingCount: 4, onOpenExisting });

    expect(screen.getByText(/ya tiene un entrenamiento con 4 ejercicios/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /añadir/i })).toBeNull();
  });

  it('en singular lo dice en singular', async () => {
    await montar({ existingCount: 1, onOpenExisting: jest.fn() });
    expect(screen.getByText(/con 1 ejercicio\./i)).toBeTruthy();
  });

  it('sin ejercicios lo describe distinto', async () => {
    await montar({ existingCount: 0, onOpenExisting: jest.fn() });
    expect(screen.getByText(/sin ejercicios/i)).toBeTruthy();
  });

  it('abrirlo avisa', async () => {
    const onOpenExisting = jest.fn();
    await montar({ existingCount: 2, onOpenExisting });

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir entrenamiento' }));

    expect(onOpenExisting).toHaveBeenCalledTimes(1);
  });

  it('sin la forma de abrirlo vuelve a la captura normal', async () => {
    await montar({ existingCount: 4 });
    expect(screen.getByRole('button', { name: 'Añadir ejercicio' })).toBeTruthy();
  });
});
