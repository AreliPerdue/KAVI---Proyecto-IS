/**
 * Pantalla de alta y edicion de actividad (RF-C5, RF-C6, RF-C8).
 *
 * Se prueba la orquestacion, no el formulario: que distinga crear de editar y de
 * editar la serie, que respete los estados de carga y error, y sobre todo el
 * orden del guardado — primero la actividad, despues sus recordatorios, y solo
 * entonces cerrar. Invertirlo dejaria recordatorios huerfanos.
 */
import type React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockCreate = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, error: null as Error | null };
const mockUpdate = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false, error: null as Error | null };
const mockSetForActivity = { mutate: jest.fn(), isPending: false };
const mockSnackbar = jest.fn();
const mockAddExercise = { mutateAsync: jest.fn() };
const mockCrearWorkout = { mutateAsync: jest.fn() };

let mockActividad: Record<string, unknown> = { data: undefined, isPending: false, isError: false, error: null, refetch: jest.fn() };
let mockRecordatorios: Record<string, unknown> = { data: [], isPending: false };
let mockWorkoutExistente: Record<string, unknown> = { data: null };

jest.mock('@/hooks/use-activity', () => ({
  useActivity: () => mockActividad,
  useActivityMutations: () => ({ create: mockCreate, update: mockUpdate, remove: { mutate: jest.fn() } }),
}));
jest.mock('@/hooks/use-themes', () => ({ useThemes: () => ({ data: [] }) }));
jest.mock('@/hooks/use-reminders', () => ({
  useActivityReminders: () => mockRecordatorios,
  useReminderMutations: () => ({ setForActivity: mockSetForActivity }),
}));
jest.mock('@/hooks/use-workouts', () => ({
  useWorkoutByActivity: () => mockWorkoutExistente,
  useWorkoutMutations: () => ({ create: mockCrearWorkout, addExercise: mockAddExercise }),
}));
jest.mock('@/providers', () => ({ useSnackbar: () => mockSnackbar }));

/**
 * El formulario real se prueba aparte. Aqui basta con un boton que dispare
 * `onSubmit` y que exponga en su texto lo que la pantalla le pasa, para poder
 * comprobarlo desde fuera.
 */
jest.mock('@/components/calendar/activity-form', () => ({
  ActivityForm: (props: {
    submitLabel: string;
    error: string | null;
    recurrenceLocked: boolean;
    submitting: boolean;
    onSubmit: (valores: Record<string, unknown>, ejercicios: unknown[]) => void;
  }) => {
    /* eslint-disable @typescript-eslint/no-require-imports -- las fabricas de jest.mock se elevan: no pueden usar imports del modulo */
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const etiquetas = [props.submitLabel, props.error, props.recurrenceLocked ? 'bloqueada' : '']
      .filter(Boolean)
      .join(' \u00b7 ');
    return React.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: props.submitLabel,
        accessibilityState: { busy: !!props.submitting },
        onPress: () => props.onSubmit({ title: 'Junta', isGym: false, reminderOffsets: [10], themeId: null }, []),
      },
      React.createElement(Text, null, etiquetas),
    );
  },
}));

jest.mock('@/components/calendar/activity-form-mapping', () => ({
  activityToFormValues: () => ({ title: 'Junta', reminderOffsets: [10] }),
  defaultFormValues: () => ({ title: '', reminderOffsets: [] }),
  formValuesToInput: (valores: { title: string }) => ({ title: valores.title, recurrence: null }),
}));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/activity/new').default as () => React.ReactElement;

const ACTIVIDAD = { id: 'a1', title: 'Junta', start_at: 'x', recurrence_rule: null, recurrence_parent_id: null };

beforeEach(() => {
  for (const m of [mockCreate, mockUpdate]) { m.mutate.mockReset(); m.mutateAsync.mockReset(); m.isPending = false; m.error = null; }
  mockSetForActivity.mutate.mockReset();
  mockSetForActivity.isPending = false;
  mockSnackbar.mockReset();
  mockAddExercise.mutateAsync.mockReset();
  mockCrearWorkout.mutateAsync.mockReset();
  mockActividad = { data: undefined, isPending: false, isError: false, error: null, refetch: jest.fn() };
  mockRecordatorios = { data: [], isPending: false };
  mockWorkoutExistente = { data: null };
  globalThis.setParametrosDeRuta({});
});

describe('modo creacion', () => {
  it('se titula "Nueva actividad"', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Nueva actividad')).toBeTruthy();
  });

  it('el boton invita a crear', async () => {
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: 'Crear actividad' })).toBeTruthy();
  });

  it('al enviar crea la actividad', async () => {
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Crear actividad' }));

    await waitFor(() => expect(mockCreate.mutate).toHaveBeenCalled());
    expect(mockCreate.mutate.mock.calls[0][0]).toMatchObject({ title: 'Junta' });
  });

  it('no consulta ninguna actividad existente', async () => {
    await render(<Pantalla />);
    expect(screen.queryByText('Editar actividad')).toBeNull();
  });
});

describe('modo edicion', () => {
  beforeEach(() => {
    globalThis.setParametrosDeRuta({ id: 'a1' });
    mockActividad = { data: ACTIVIDAD, isPending: false, isError: false, error: null, refetch: jest.fn() };
  });

  it('se titula "Editar actividad"', async () => {
    await render(<Pantalla />);
    expect(screen.getByText('Editar actividad')).toBeTruthy();
  });

  it('con alcance de serie lo dice en el titulo', async () => {
    globalThis.setParametrosDeRuta({ id: 'a1', scope: 'series' });
    await render(<Pantalla />);
    expect(screen.getByText('Editar toda la serie')).toBeTruthy();
  });

  it('el boton invita a guardar', async () => {
    await render(<Pantalla />);
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
  });

  it('mientras carga muestra el estado de carga', async () => {
    mockActividad = { ...mockActividad, isPending: true };
    await render(<Pantalla />);
    expect(screen.getByText('Cargando…')).toBeTruthy();
  });

  it('tambien espera a los recordatorios antes de pintar el formulario', async () => {
    mockRecordatorios = { data: undefined, isPending: true };
    await render(<Pantalla />);
    expect(screen.getByText('Cargando…')).toBeTruthy();
  });

  it('si falla muestra el error con reintentar', async () => {
    mockActividad = { data: undefined, isPending: false, isError: true, error: new Error('Esta actividad ya no existe.'), refetch: jest.fn() };
    await render(<Pantalla />);

    expect(screen.getByText('Esta actividad ya no existe.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('reintentar vuelve a consultar', async () => {
    const refetch = jest.fn();
    mockActividad = { data: undefined, isPending: false, isError: true, error: new Error('x'), refetch };
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('al guardar actualiza con el alcance recibido', async () => {
    globalThis.setParametrosDeRuta({ id: 'a1', scope: 'series' });
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mockUpdate.mutate).toHaveBeenCalled());
    expect(mockUpdate.mutate.mock.calls[0][0]).toMatchObject({ id: 'a1', scope: 'series' });
  });

  it('los recordatorios se guardan despues de la actividad, no antes', async () => {
    mockUpdate.mutate.mockImplementation((_v: unknown, o: { onSuccess?: (s: unknown) => void }) => o?.onSuccess?.({ id: 'a1' }));
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mockSetForActivity.mutate).toHaveBeenCalled());
    expect(mockSetForActivity.mutate.mock.calls[0][0]).toEqual({ activityId: 'a1', offsets: [10] });
  });

  it('solo se avisa y se cierra cuando los recordatorios terminan', async () => {
    mockUpdate.mutate.mockImplementation((_v: unknown, o: { onSuccess?: (s: unknown) => void }) => o?.onSuccess?.({ id: 'a1' }));
    mockSetForActivity.mutate.mockImplementation((_v: unknown, o: { onSettled?: () => void }) => o?.onSettled?.());
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Cambios guardados.' }));
    expect(globalThis.mockRouter.back).toHaveBeenCalled();
  });

  it('editar la serie lo dice en el aviso', async () => {
    globalThis.setParametrosDeRuta({ id: 'a1', scope: 'series' });
    mockUpdate.mutate.mockImplementation((_v: unknown, o: { onSuccess?: (s: unknown) => void }) => o?.onSuccess?.({ id: 'a1' }));
    mockSetForActivity.mutate.mockImplementation((_v: unknown, o: { onSettled?: () => void }) => o?.onSettled?.());
    await render(<Pantalla />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mockSnackbar).toHaveBeenCalledWith({ message: 'Serie actualizada.' }));
  });

  it('muestra el error de la mutacion', async () => {
    mockUpdate.error = new Error('No tienes permiso para hacer eso.');
    await render(<Pantalla />);

    expect(screen.getByText(/no tienes permiso/i)).toBeTruthy();
  });

  it('mientras guarda el boton queda ocupado', async () => {
    mockUpdate.isPending = true;
    await render(<Pantalla />);

    expect(screen.getByRole('button', { name: 'Guardar cambios' }).props.accessibilityState.busy).toBe(true);
  });

  it('editar una sola ocurrencia bloquea cambiar la recurrencia', async () => {
    mockActividad = { ...mockActividad, data: { ...ACTIVIDAD, recurrence_parent_id: 'padre' } };
    await render(<Pantalla />);

    expect(screen.getByText(/bloqueada/)).toBeTruthy();
  });

  it('editar la serie completa si permite cambiarla', async () => {
    globalThis.setParametrosDeRuta({ id: 'a1', scope: 'series' });
    mockActividad = { ...mockActividad, data: { ...ACTIVIDAD, recurrence_rule: 'FREQ=DAILY' } };
    await render(<Pantalla />);

    expect(screen.queryByText(/bloqueada/)).toBeNull();
  });
});
