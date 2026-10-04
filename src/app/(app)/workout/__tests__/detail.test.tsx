/**
 * Sesión de gym: el logger en vivo (spec 07 v2, RF-F27 – RF-F42).
 *
 * Fija lo que hace el logger y no se ve en el código de cada pieza: una serie se registra
 * con un toque si se repite (nace prellenada), marcarla arranca el descanso, el teclado
 * guarda al cerrarse, un drop es un segmento más de la misma serie, borrar ofrece
 * deshacer, y la sesión se termina o se descarta explícitamente.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { newSet, setSegmentField } from '@/lib/gym/sets';
import { useGymStore } from '@/store/gym-store';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Exercise, WorkoutSet } from '@/types/domain';

const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockSave = jest.fn();
const mockRemove = jest.fn();
const mockMut = {
  update: { mutate: jest.fn(), error: null },
  remove: { mutate: jest.fn() },
  addExercise: { mutate: jest.fn(), isPending: false, error: null },
  updateExercise: { mutate: jest.fn() },
  removeExercise: { mutate: jest.fn() },
  restoreExercise: { mutate: jest.fn() },
  duplicate: { mutate: jest.fn(), isPending: false },
  create: { mutate: jest.fn() },
};
let mockSesion: Record<string, unknown>;

const BANCA: Exercise = {
  id: 'cat-banca', slug: 'press-de-banca-plano-con-barra', name_es: 'Press de banca plano con barra', name_en: 'Barbell bench press',
  aliases: ['banca'], family: 'Press plano', primary_muscles: ['chest_mid'], secondary_muscles: [], equipment: ['barbell'],
  movement_pattern: 'horizontal_push', mechanic: 'compound', laterality: 'bilateral', tracking_type: 'weight_reps', created_by: null, archived_at: null,
};

jest.mock('@/hooks/use-set-sync', () => ({
  useSessionDetail: () => mockSesion,
  useSetActions: () => ({ saveSet: mockSave, removeSet: mockRemove }),
}));
jest.mock('@/hooks/use-exercise-history', () => ({
  // Sin historial: lo de "Anterior" y los PRs tienen sus propias pruebas en lib/gym.
  exerciseHistoryQuery: (_u: string, ref: { name: string }) => ({ queryKey: ['historial', ref.name], queryFn: async () => [] }),
  useLegacyConversion: () => undefined,
}));
jest.mock('@/hooks/use-exercises', () => ({ useExercises: () => ({ data: [mockBanca()], index: new Map() }) }));
function mockBanca() {
  return BANCA;
}
jest.mock('@/hooks/use-workouts', () => ({ useWorkouts: () => ({ data: [] }), useWorkoutMutations: () => mockMut }));
jest.mock('@/hooks/use-activities-range', () => ({ useActivitiesRange: () => ({ data: [] }) }));
jest.mock('@/lib/notifications', () => ({ scheduleRestEnd: async () => false, cancelRestEnd: async () => undefined }));
jest.mock('@/providers', () => ({ useConfirm: () => mockConfirm, useSnackbar: () => mockSnackbar, useAuth: () => ({ userId: 'u1' }) }));
/** El selector real pide el catálogo; aquí un botón elige la banca. */
jest.mock('@/components/fitness/exercise-picker', () => {
  /* eslint-disable @typescript-eslint/no-require-imports -- las fabricas de jest.mock se elevan */
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const ExercisePicker = (props: { visible: boolean; onPick: (e: unknown) => void }) =>
    props.visible
      ? React.createElement(Pressable, { accessibilityRole: 'button', accessibilityLabel: 'elegir banca', onPress: () => props.onPick(mockBanca()) }, React.createElement(Text, null, 'elegir'))
      : null;
  return { ExercisePicker };
});

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/workout/[id]').default as () => React.ReactElement;

function serie(kg: number | null, reps: number | null, over: Partial<WorkoutSet> = {}): WorkoutSet {
  let s = newSet('e1', over.sort_order ?? 1, null, 'kg');
  if (kg !== null) s = setSegmentField(s, 0, 'weight_kg', kg, 'kg');
  if (reps !== null) s = setSegmentField(s, 0, 'reps', reps, 'kg');
  return { ...s, ...over };
}

const ejercicio = (over = {}) => ({
  id: 'e1', workout_id: 'w1', position: 0, name: 'Press de banca plano con barra', exercise_id: 'cat-banca',
  sets: null, reps: null, weight: null, duration_minutes: null, notes: null, legacy_converted_at: null,
  workout_sets: [serie(100, 8, { id: 's1' })], ...over,
});
const sesion = (over = {}) => ({
  id: 'w1', owner_id: 'u1', activity_id: null, activity_title: null, title: 'Empuje A', status: 'active',
  performed_at: new Date().toISOString(), ended_at: null, bodyweight_kg: null, energy: null, pump: null, tags: [],
  notes: null, created_at: 'x', updated_at: 'x', edited_at: null, duration_minutes: null, groups: [],
  exercises: [ejercicio()], ...over,
});

async function montar() {
  // `gcTime: Infinity` no programa la limpieza del caché: sin eso, sus temporizadores de 5
  // minutos dejan a Jest esperando después de la última prueba.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={qc}>
      <Pantalla />
    </QueryClientProvider>,
  );
}

const ultimoGuardado = (): WorkoutSet => mockSave.mock.calls.at(-1)?.[0];

beforeEach(() => {
  usePreferencesStore.setState({ lastWorkoutTitle: null });
  useGymStore.setState({ rest: null, weightUnit: 'kg', effortScale: 'rir', restDefaultSec: 120, dropPercent: 20, hydrated: true });
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  mockSave.mockReset();
  mockRemove.mockReset();
  for (const mut of Object.values(mockMut)) mut.mutate.mockReset();
  mockSesion = { data: sesion(), isPending: false, isError: false, error: null, refetch: jest.fn(), pendientes: new Set() };
  globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
});

describe('estados', () => {
  it('mientras carga no pinta la sesión', async () => {
    mockSesion = { ...mockSesion, data: undefined, isPending: true };
    await montar();
    expect(screen.queryByText('Empuje A')).toBeNull();
  });

  it('si falla explica y deja reintentar', async () => {
    const refetch = jest.fn();
    mockSesion = { ...mockSesion, data: undefined, isError: true, error: new Error('Sin conexión'), refetch };
    await montar();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('registrar series (RF-F27, RF-F31)', () => {
  it('pinta la serie con su peso y sus reps', async () => {
    await montar();
    expect(screen.getByLabelText('kg de la serie 1: 100')).toBeTruthy();
    expect(screen.getByLabelText('Reps de la serie 1: 8')).toBeTruthy();
  });

  it('marcar ✓ guarda la serie como hecha y arranca el descanso', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Marcar hecha la serie 1' }));

    expect(ultimoGuardado().id).toBe('s1');
    expect(ultimoGuardado().completed_at).toEqual(expect.any(String));
    expect(useGymStore.getState().rest).toMatchObject({ workoutId: 'w1', durationSec: 120 });
  });

  it('desmarcar la deja pendiente otra vez', async () => {
    mockSesion = { ...mockSesion, data: sesion({ exercises: [ejercicio({ workout_sets: [serie(100, 8, { id: 's1', completed_at: '2026-10-04T10:00:00Z' })] })] }) };
    await montar();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Desmarcar la serie 1' }));
    expect(ultimoGuardado().completed_at).toBeNull();
  });

  it('"+ Serie" crea otra prellenada con la última: repetirla es solo ✓', async () => {
    await montar();
    await fireEvent.press(screen.getByLabelText('Agregar serie a Press de banca plano con barra'));

    const nueva = ultimoGuardado();
    expect(nueva.id).not.toBe('s1');
    expect(nueva.segments[0]).toMatchObject({ weight_kg: 100, reps: 8 });
    expect(nueva.completed_at).toBeNull();
  });

  it('el teclado propio guarda al cerrarse', async () => {
    await montar();
    await fireEvent.press(screen.getByLabelText('kg de la serie 1: 100'));
    await fireEvent.press(screen.getByRole('button', { name: '1' }));
    await fireEvent.press(screen.getByRole('button', { name: '0' }));
    await fireEvent.press(screen.getByRole('button', { name: '5' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Listo' }));

    expect(ultimoGuardado().segments[0].weight_kg).toBe(105);
  });
});

describe('menú de la serie (RF-F32, RF-F44)', () => {
  it('+ Drop agrega un segmento a la misma serie, 20 % más ligero', async () => {
    await montar();
    await fireEvent.press(screen.getByLabelText('Opciones de la serie 1'));
    await fireEvent.press(screen.getByText('+ Drop (−20 %)'));

    const s = ultimoGuardado();
    expect(s.id).toBe('s1');
    expect(s.segments.map((g) => [g.kind, g.weight_kg])).toEqual([['main', 100], ['drop', 80]]);
  });

  it('cambiar el tipo de serie', async () => {
    await montar();
    await fireEvent.press(screen.getByLabelText('Opciones de la serie 1'));
    await fireEvent.press(screen.getByText('Calentamiento'));
    expect(ultimoGuardado().set_type).toBe('warmup');
  });

  it('borrar ofrece deshacer, que vuelve a guardar la misma serie', async () => {
    await montar();
    await fireEvent.press(screen.getByLabelText('Opciones de la serie 1'));
    await fireEvent.press(screen.getByText('Borrar serie'));

    expect(mockRemove).toHaveBeenCalledWith('s1');
    mockSnackbar.mock.calls[0][0].onAction();
    expect(ultimoGuardado().id).toBe('s1');
  });
});

describe('ejercicios', () => {
  it('"+ Ejercicio" elige del catálogo y lo liga (sin ejercicios vacíos)', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Ejercicio' }));
    await fireEvent.press(screen.getByLabelText('elegir banca'));

    expect(mockMut.addExercise.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ workoutId: 'w1', input: expect.objectContaining({ name: BANCA.name_es, exercise_id: 'cat-banca', position: 1 }) }),
    );
  });

  it('un ejercicio nuevo nace con su primera serie', async () => {
    mockSesion = { ...mockSesion, data: sesion({ exercises: [ejercicio({ workout_sets: [] })] }) };
    await montar();
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(ultimoGuardado().workout_exercise_id).toBe('e1');
  });

  it('lo de v1 que no se pudo convertir sin adivinar se sigue viendo', async () => {
    mockSesion = {
      ...mockSesion,
      data: sesion({ exercises: [ejercicio({ exercise_id: null, reps: '12/10/8', weight: '40kg + cadena', legacy_converted_at: '2026-10-04T10:00:00Z' })] }),
    };
    await montar();
    expect(screen.getByText(/Texto original: 12\/10\/8 · 40kg \+ cadena/)).toBeTruthy();
  });
});

describe('sesión', () => {
  it('terminar la marca como completada y muestra el resumen', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Terminar sesión' }));

    expect(mockMut.update.mutate).toHaveBeenCalledWith({ id: 'w1', patch: expect.objectContaining({ status: 'completed', ended_at: expect.any(String) }) });
    expect(screen.getByText('Sesión terminada')).toBeTruthy();
  });

  it('descartar pide confirmación', async () => {
    await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Descartar sesión' }));
    await waitFor(() => expect(mockMut.update.mutate).toHaveBeenCalledWith({ id: 'w1', patch: { status: 'discarded' } }, expect.any(Object)));
    expect(mockConfirm).toHaveBeenCalled();
  });

  it('en lectura no se puede marcar ni agregar, y se ofrece editar', async () => {
    globalThis.setParametrosDeRuta({ id: 'w1', mode: 'view' });
    mockSesion = { ...mockSesion, data: sesion({ status: 'completed' }) };
    await montar();

    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
    expect(screen.queryByLabelText('Agregar serie a Press de banca plano con barra')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Marcar hecha la serie 1' }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('duplicar sigue disponible', async () => {
    await montar();
    expect(screen.getByRole('button', { name: 'Duplicar en…' })).toBeTruthy();
  });
});
