/**
 * Formulario de actividad (RF-C5, RF-C6, RF-C8, RF-F9).
 *
 * Tres reglas que la pantalla no puede comprobar y este componente si: marcar
 * "todo el dia" retira las horas, editar una sola ocurrencia de una serie
 * bloquea cambiar la repeticion, y marcar la actividad como de gimnasio abre la
 * captura de ejercicios para registrarla al crearla.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ActivityForm } from '@/components/calendar/activity-form';
import { defaultFormValues } from '@/components/calendar/activity-form-mapping';

jest.mock('@/hooks/use-themes', () => ({
  useThemes: () => ({ data: [] }),
  useThemesByDimension: () => [],
}));
/** La captura de rutina consulta el autocompletado, que necesita sesion. */
jest.mock('@/hooks/use-workouts', () => ({ useExerciseNames: () => ({ data: [] }) }));

const campo = (label: string) => screen.getByLabelText(label, { includeHiddenElements: true });

const montar = (props: Partial<Parameters<typeof ActivityForm>[0]> = {}) =>
  render(
    <ActivityForm
      defaultValues={defaultFormValues({ dayKey: '2026-09-07', startMinutes: 540, endMinutes: 600 })}
      submitLabel="Crear actividad"
      submitting={false}
      error={null}
      onSubmit={jest.fn()}
      {...props}
    />,
  );

describe('campos basicos', () => {
  it('muestra titulo, fecha y horas', async () => {
    await montar();

    expect(campo('Título')).toBeTruthy();
    expect(screen.getByLabelText(/^Fecha:/)).toBeTruthy();
    expect(screen.getByLabelText(/^Inicio:/)).toBeTruthy();
    expect(screen.getByLabelText(/^Fin:/)).toBeTruthy();
  });

  it('las horas vienen de los valores iniciales', async () => {
    await montar();

    expect(screen.getByLabelText('Inicio: 09:00')).toBeTruthy();
    expect(screen.getByLabelText('Fin: 10:00')).toBeTruthy();
  });

  it('el boton lleva la etiqueta pedida', async () => {
    await montar({ submitLabel: 'Guardar cambios' });
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
  });

  it('muestra el error recibido', async () => {
    await montar({ error: 'No tienes permiso para hacer eso.' });
    expect(screen.getByText(/no tienes permiso/i)).toBeTruthy();
  });

  it('mientras guarda el boton queda ocupado', async () => {
    await montar({ submitting: true });

    expect(screen.getByRole('button', { name: 'Crear actividad' }).props.accessibilityState.busy).toBe(true);
  });
});

describe('validacion', () => {
  it('no envia sin titulo', async () => {
    const onSubmit = jest.fn();
    await montar({ onSubmit });

    await fireEvent.press(screen.getByRole('button', { name: 'Crear actividad' }));

    await waitFor(() => expect(campo('Título')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('con titulo si envia', async () => {
    const onSubmit = jest.fn();
    await montar({ onSubmit });

    await fireEvent.changeText(campo('Título'), 'Junta de equipo');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear actividad' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Junta de equipo' });
  });
});

describe('todo el dia', () => {
  it('por defecto no esta marcado y se ven las horas', async () => {
    await montar();

    expect(screen.getByRole('switch', { name: 'Todo el día' }).props.accessibilityState.checked).toBe(false);
    expect(screen.getByLabelText(/^Inicio:/)).toBeTruthy();
  });

  it('al marcarlo desaparecen las horas', async () => {
    await montar();

    await fireEvent.press(screen.getByRole('switch', { name: 'Todo el día' }));

    await waitFor(() => expect(screen.queryByLabelText(/^Inicio:/)).toBeNull());
    expect(screen.queryByLabelText(/^Fin:/)).toBeNull();
  });

  it('la fecha sigue estando', async () => {
    await montar();

    await fireEvent.press(screen.getByRole('switch', { name: 'Todo el día' }));

    await waitFor(() => expect(screen.getByLabelText(/^Fecha:/)).toBeTruthy());
  });
});

describe('recurrencia (RF-C8)', () => {
  it('se puede elegir la frecuencia cuando no esta bloqueada', async () => {
    await montar();

    expect(screen.getByText('Repetir')).toBeTruthy();
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(0);
  });

  it('al editar una sola ocurrencia se explica por que no se puede', async () => {
    await montar({ recurrenceLocked: true });

    expect(screen.getByText(/se edita desde la serie completa/i)).toBeTruthy();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});

describe('gimnasio (RF-F9)', () => {
  it('por defecto no esta marcado', async () => {
    await montar();

    expect(screen.getByRole('switch', { name: 'Actividad de gimnasio' }).props.accessibilityState.checked).toBe(false);
  });

  it('al marcarlo aparece la captura de rutina', async () => {
    await montar();
    expect(screen.queryByText('Entrenamiento')).toBeNull();

    await fireEvent.press(screen.getByRole('switch', { name: 'Actividad de gimnasio' }));

    await waitFor(() => expect(screen.getByText('Entrenamiento')).toBeTruthy());
  });

  it('con un entrenamiento ya existente ofrece abrirlo en vez de duplicarlo', async () => {
    const onOpenExistingWorkout = jest.fn();
    await montar({ existingWorkoutCount: 3, onOpenExistingWorkout });

    await fireEvent.press(screen.getByRole('switch', { name: 'Actividad de gimnasio' }));

    await waitFor(() => expect(screen.getByText(/ya tiene un entrenamiento con 3 ejercicios/i)).toBeTruthy());

    await fireEvent.press(screen.getByRole('button', { name: 'Abrir entrenamiento' }));
    expect(onOpenExistingWorkout).toHaveBeenCalledTimes(1);
  });

  it('un entrenamiento existente sin ejercicios se describe distinto', async () => {
    await montar({ existingWorkoutCount: 0, onOpenExistingWorkout: jest.fn() });

    await fireEvent.press(screen.getByRole('switch', { name: 'Actividad de gimnasio' }));

    await waitFor(() => expect(screen.getByText(/sin ejercicios/i)).toBeTruthy());
  });
});

describe('descripcion', () => {
  it('es opcional', async () => {
    const onSubmit = jest.fn();
    await montar({ onSubmit });

    await fireEvent.changeText(campo('Título'), 'Sin descripción');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear actividad' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('se propaga cuando se escribe', async () => {
    const onSubmit = jest.fn();
    await montar({ onSubmit });

    await fireEvent.changeText(campo('Título'), 'Junta');
    await fireEvent.changeText(campo('Descripción'), 'Revisar el avance');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear actividad' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ description: 'Revisar el avance' });
  });
});
