/**
 * Tarjeta de ejercicio (RF-F4, RF-F5).
 *
 * Guarda cada campo al perder el foco, no con un boton: durante una sesion de
 * gimnasio se anotan series entre repeticiones y obligar a pulsar "guardar" cada
 * vez seria inviable. Eso hace que el contrato importante sea *cuando* se llama
 * a `onSave` y con que.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ExerciseCard } from '@/components/fitness/exercise-card';
import type { WorkoutExercise } from '@/types/domain';

const ejercicio = (over: Partial<WorkoutExercise> = {}): WorkoutExercise => ({
  id: 'e1', workout_id: 'w1', position: 0, name: 'Sentadilla',
  sets: 4, reps: '8', weight: '80 kg', duration_minutes: null, notes: null, ...over,
});

const campo = (label: string) => screen.getByLabelText(label, { includeHiddenElements: true });

const montar = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) =>
  render(
    <ExerciseCard
      exercise={ejercicio()}
      index={0}
      suggestions={[]}
      onSave={jest.fn()}
      onDelete={jest.fn()}
      {...props}
    />,
  );

describe('contenido', () => {
  it('muestra los valores guardados', async () => {
    await montar();

    expect(campo('Nombre').props.value).toBe('Sentadilla');
    expect(campo('Series').props.value).toBe('4');
    expect(campo('Reps').props.value).toBe('8');
    expect(campo('Peso').props.value).toBe('80 kg');
  });

  it('los campos vacios se muestran vacios, no como "null"', async () => {
    await montar({ exercise: ejercicio({ sets: null, reps: null, weight: null, notes: null }) });

    expect(campo('Series').props.value).toBe('');
    expect(campo('Reps').props.value).toBe('');
    expect(campo('Notas').props.value).toBe('');
  });

  it('ofrece eliminar con el nombre en la etiqueta', async () => {
    await montar();
    expect(screen.getByLabelText('Eliminar Sentadilla')).toBeTruthy();
  });

  it('un ejercicio sin nombre sigue teniendo etiqueta util', async () => {
    await montar({ exercise: ejercicio({ name: '' }) });
    expect(screen.getByLabelText('Eliminar ejercicio')).toBeTruthy();
  });
});

describe('guardado al perder el foco (RF-F5)', () => {
  it('escribir no guarda todavia', async () => {
    const onSave = jest.fn();
    await montar({ onSave });

    await fireEvent.changeText(campo('Peso'), '90 kg');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('al salir del campo si guarda', async () => {
    const onSave = jest.fn();
    await montar({ onSave });

    await fireEvent.changeText(campo('Peso'), '90 kg');
    await fireEvent(campo('Peso'), 'blur');

    expect(onSave).toHaveBeenCalledWith({ weight: '90 kg' });
  });

  it('las series se guardan como numero', async () => {
    const onSave = jest.fn();
    await montar({ onSave });

    await fireEvent.changeText(campo('Series'), '5');
    await fireEvent(campo('Series'), 'blur');

    expect(onSave).toHaveBeenCalledWith({ sets: 5 });
  });

  it('un numero invalido se guarda como vacio, no como cero', async () => {
    const onSave = jest.fn();
    await montar({ onSave });

    await fireEvent.changeText(campo('Series'), 'abc');
    await fireEvent(campo('Series'), 'blur');

    expect(onSave).toHaveBeenCalledWith({ sets: null });
  });

  it('un cero tampoco se guarda: no hay series de cero', async () => {
    const onSave = jest.fn();
    await montar({ onSave });

    await fireEvent.changeText(campo('Series'), '0');
    await fireEvent(campo('Series'), 'blur');

    expect(onSave).toHaveBeenCalledWith({ sets: null });
  });

  it('un texto en blanco se guarda como vacio', async () => {
    const onSave = jest.fn();
    await montar({ onSave });

    await fireEvent.changeText(campo('Reps'), '   ');
    await fireEvent(campo('Reps'), 'blur');

    expect(onSave).toHaveBeenCalledWith({ reps: null });
  });

  it('las notas tambien se recortan', async () => {
    const onSave = jest.fn();
    await montar({ onSave });

    await fireEvent.changeText(campo('Notas'), '  subir peso  ');
    await fireEvent(campo('Notas'), 'blur');

    expect(onSave).toHaveBeenCalledWith({ notes: 'subir peso' });
  });
});

describe('autocompletado de nombres (RF-F4)', () => {
  it('sin foco en el nombre no propone nada', async () => {
    await montar({ suggestions: ['Sentadilla búlgara'] });

    expect(screen.queryByLabelText(/usar sentadilla búlgara/i)).toBeNull();
  });

  it('al enfocar propone lo ya escrito antes', async () => {
    await montar({ exercise: ejercicio({ name: 'Sent' }), suggestions: ['Sentadilla búlgara'] });

    await fireEvent(campo('Nombre'), 'focus');

    expect(screen.getByLabelText('Usar Sentadilla búlgara')).toBeTruthy();
  });

  it('elegir una sugerencia la escribe y la guarda', async () => {
    const onSave = jest.fn();
    await montar({ exercise: ejercicio({ name: 'Sent' }), suggestions: ['Sentadilla búlgara'], onSave });

    await fireEvent(campo('Nombre'), 'focus');
    await fireEvent.press(screen.getByLabelText('Usar Sentadilla búlgara'));

    expect(onSave).toHaveBeenCalledWith({ name: 'Sentadilla búlgara' });
  });
});

describe('modo lectura', () => {
  it('no ofrece eliminar', async () => {
    await montar({ readOnly: true });
    expect(screen.queryByLabelText('Eliminar Sentadilla')).toBeNull();
  });
});

describe('eliminar', () => {
  it('avisa al pulsarlo', async () => {
    const onDelete = jest.fn();
    await montar({ onDelete });

    await fireEvent.press(screen.getByLabelText('Eliminar Sentadilla'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
