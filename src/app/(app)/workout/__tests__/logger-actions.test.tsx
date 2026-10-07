/**
 * Logger: lo que la pantalla decide con lo que le avisan sus piezas (spec 07 v2). El bloque de
 * ejercicio, los intensificadores, las variantes, la hoja de reordenar y el selector de hora se
 * sustituyen por dobles que guardan sus props: así se llama directo a `onMoveSet`, `onSave`…
 * sin simular un arrastre, que ya tiene su prueba en `lib/__tests__/drag.test.ts`.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { newSet, setSegmentField } from '@/lib/gym/sets';
import { useGymStore } from '@/store/gym-store';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Exercise, WorkoutSet } from '@/types/domain';

const mockConfirm = jest.fn();
const mockSnackbar = jest.fn();
const mockSave = jest.fn();
/** Las props más recientes de cada doble, por ejercicio o por nombre de hoja. */
const mockProps: Record<string, Record<string, (...a: never[]) => unknown> & Record<string, unknown>> = {};
const mockRemove = jest.fn();
const mockMut = {
  update: { mutate: jest.fn(), error: null },
  remove: { mutate: jest.fn() },
  addExercise: { mutate: jest.fn(), isPending: false, error: null },
  updateExercise: { mutate: jest.fn(), mutateAsync: jest.fn() },
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
jest.mock('@/hooks/use-exercises', () => ({
  useExercises: () => ({ data: [mockBanca()], index: new Map() }),
  // Notas fijas (RF-F52): sin ninguna; tienen su propia prueba en el detalle del ejercicio.
  useExercisePrefs: () => ({ data: [] }),
  useExerciseMutations: () => ({ saveStickyNote: { mutate: jest.fn() } }),
}));
function mockBanca() {
  return BANCA;
}
jest.mock('@/hooks/use-workouts', () => ({
  useWorkouts: () => ({ data: [] }),
  useWorkoutMutations: () => mockMut,
  workoutKeys: jest.requireActual('@/hooks/use-workouts').workoutKeys,
}));
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

/** Dobles que solo guardan sus props. */
jest.mock('@/components/fitness/exercise-block', () => ({
  ExerciseBlock: (p: { exercise: { id: string } }) => { mockProps[p.exercise.id] = p as never; return null; },
}));
jest.mock('@/components/fitness/intensifier-sheet', () => ({
  IntensifierSheet: (p: Record<string, unknown>) => { mockProps.intensificadores = p as never; return null; },
}));
jest.mock('@/components/fitness/variant-sheet', () => ({
  VariantSheet: (p: Record<string, unknown>) => { mockProps.variante = p as never; return null; },
}));
jest.mock('@/components/fitness/reorder-exercises-sheet', () => ({
  ReorderExercisesSheet: (p: Record<string, unknown>) => { mockProps.reordenar = p as never; return null; },
}));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual('@/components/ui'),
  TimePickerSheet: (p: Record<string, unknown>) => { mockProps.hora = p as never; return null; },
}));

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
const llamar = (doble: string, prop: string, ...args: unknown[]) => act(async () => { await (mockProps[doble]?.[prop] as (...a: unknown[]) => unknown)(...args); });
const editadas = () => mockMut.update.mutate.mock.calls.filter(([v]) => 'edited_at' in v.patch);

beforeEach(() => {
  usePreferencesStore.setState({ lastWorkoutTitle: null });
  useGymStore.setState({ rest: null, weightUnit: 'kg', effortScale: 'rir', restDefaultSec: 120, dropPercent: 20, hydrated: true });
  mockConfirm.mockReset().mockResolvedValue(true);
  mockSnackbar.mockReset();
  mockSave.mockReset();
  mockRemove.mockReset();
  for (const mut of Object.values(mockMut)) mut.mutate.mockReset();
  mockMut.updateExercise.mutateAsync.mockReset().mockResolvedValue(undefined);
  for (const k of Object.keys(mockProps)) delete mockProps[k];
  mockSesion = { data: sesion(), isPending: false, isError: false, error: null, refetch: jest.fn(), pendientes: new Set() };
  globalThis.setParametrosDeRuta({ id: 'w1', mode: 'edit' });
});

describe('mover series (RF-F33)', () => {
  const tres = () => ejercicio({ workout_sets: [serie(100, 8, { id: 'a', sort_order: 1 }), serie(100, 8, { id: 'b', sort_order: 2 }), serie(100, 8, { id: 'c', sort_order: 3 })] });

  it.each([
    ['arriba (la última al inicio)', 2, 0, 'c', (o: number) => o < 1],
    ['en medio (la primera entre b y c)', 0, 1, 'a', (o: number) => o > 2 && o < 3],
    ['al final (la primera al último lugar)', 0, 2, 'a', (o: number) => o > 3],
  ])('%s: queda entre sus nuevos vecinos', async (_n, from, to, id, ok) => {
    const ex = tres();
    mockSesion = { ...mockSesion, data: sesion({ exercises: [ex] }) };
    await montar();
    await llamar('e1', 'onMoveSet', ex, from, to);
    expect(ultimoGuardado().id).toBe(id);
    expect(ok(ultimoGuardado().sort_order)).toBe(true);
  });

  it('soltar en el mismo lugar no guarda nada', async () => {
    const ex = tres();
    mockSesion = { ...mockSesion, data: sesion({ exercises: [ex] }) };
    await montar();
    await llamar('e1', 'onMoveSet', ex, 1, 1);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('se puede deshacer: vuelve a guardar la serie con su orden de antes', async () => {
    const ex = tres();
    mockSesion = { ...mockSesion, data: sesion({ exercises: [ex] }) };
    await montar();
    await llamar('e1', 'onMoveSet', ex, 2, 0);
    await fireEvent.press(screen.getByLabelText('Deshacer'));
    expect(ultimoGuardado()).toEqual(expect.objectContaining({ id: 'c', sort_order: 3 }));
  });
});

describe('reordenar ejercicios (RF-F33)', () => {
  const dos = () => sesion({ status: 'completed', ended_at: new Date().toISOString(), exercises: [ejercicio({ id: 'e1', position: 0 }), ejercicio({ id: 'e2', position: 1, workout_sets: [] }), ejercicio({ id: 'e3', position: 2, workout_sets: [] })] });

  it('solo guarda las posiciones que cambiaron, reordena el caché al momento y marca editada', async () => {
    mockSesion = { ...mockSesion, data: dos() };
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    qc.setQueryData(['workouts', 'detail', 'w1'], dos());
    await render(<QueryClientProvider client={qc}><Pantalla /></QueryClientProvider>);
    await llamar('reordenar', 'onSave', ['e2', 'e1', 'e3']);

    expect(mockMut.updateExercise.mutateAsync.mock.calls.map(([v]) => v)).toEqual([
      { id: 'e2', patch: { position: 0 } },
      { id: 'e1', patch: { position: 1 } },
    ]);
    const cache = qc.getQueryData<{ exercises: { id: string; position: number }[] }>(['workouts', 'detail', 'w1']);
    expect(cache?.exercises.map((e) => [e.id, e.position])).toEqual([['e2', 0], ['e1', 1], ['e3', 2]]);
    expect(editadas()).toHaveLength(1);
  });

  it('el mismo orden no escribe nada', async () => {
    mockSesion = { ...mockSesion, data: dos() };
    await montar();
    await llamar('reordenar', 'onSave', ['e1', 'e2', 'e3']);
    expect(mockMut.updateExercise.mutateAsync).not.toHaveBeenCalled();
  });
});

describe('sesión editada (RF-F42)', () => {
  it('una sesión terminada se marca editada una sola vez por visita', async () => {
    mockSesion = { ...mockSesion, data: sesion({ status: 'completed', ended_at: new Date().toISOString() }) };
    await montar();
    const ex = (mockSesion.data as { exercises: never[] }).exercises[0];
    await llamar('e1', 'onAddSet', ex);
    await llamar('e1', 'onAddSet', ex);
    await llamar('e1', 'onDelete', ex, serie(100, 8, { id: 's1' }));
    expect(editadas()).toHaveLength(1);
  });

  it('en una sesión en curso registrar series nunca la marca', async () => {
    await montar();
    const ex = (mockSesion.data as { exercises: never[] }).exercises[0];
    await llamar('e1', 'onAddSet', ex);
    await llamar('e1', 'onToggle', ex, serie(100, 8, { id: 's1' }));
    expect(editadas()).toHaveLength(0);
  });
});

describe('hora de la sesión', () => {
  it('cambiar la hora corre también ended_at: la duración se conserva', async () => {
    const inicio = new Date(2026, 9, 1, 10, 0);
    const fin = new Date(2026, 9, 1, 11, 15);
    mockSesion = { ...mockSesion, data: sesion({ status: 'completed', performed_at: inicio.toISOString(), ended_at: fin.toISOString() }) };
    await montar();
    await llamar('hora', 'onSelect', 7 * 60 + 30);
    const patch = mockMut.update.mutate.mock.calls.at(-1)?.[0].patch;
    expect(new Date(patch.performed_at).getHours()).toBe(7);
    expect(new Date(patch.performed_at).getMinutes()).toBe(30);
    expect(new Date(patch.ended_at).getTime() - new Date(patch.performed_at).getTime()).toBe(75 * 60_000);
    expect(patch.edited_at).toBeDefined();
  });

  it('sin ended_at (en curso) lo deja vacío y no marca editada', async () => {
    await montar();
    await llamar('hora', 'onSelect', 6 * 60);
    const patch = mockMut.update.mutate.mock.calls.at(-1)?.[0].patch;
    expect(patch.ended_at).toBeNull();
    expect(patch.edited_at).toBeUndefined();
  });
});

describe('descanso en agrupaciones (RF-F45)', () => {
  const superserie = () =>
    sesion({
      groups: [{ id: 'g1', workout_id: 'w1', kind: 'superset', rest_after_round_sec: 150, deleted_at: null }],
      exercises: [
        ejercicio({ id: 'e1', position: 0, group_id: 'g1', group_position: 1, rest_target_sec: 60 }),
        ejercicio({ id: 'e2', position: 1, group_id: 'g1', group_position: 2, rest_target_sec: 60, workout_sets: [serie(40, 12, { id: 's2' })] }),
      ],
    });

  it('tras el primero del grupo no hay descanso: se avisa el siguiente', async () => {
    mockSesion = { ...mockSesion, data: superserie() };
    await montar();
    const [a] = (mockSesion.data as { exercises: never[] }).exercises;
    await llamar('e1', 'onToggle', a, serie(100, 8, { id: 's1' }));
    expect(useGymStore.getState().rest).toBeNull();
    expect(mockSnackbar).toHaveBeenCalled();
  });

  it('al terminar el último corre el descanso de ronda (rest_after_round_sec)', async () => {
    mockSesion = { ...mockSesion, data: superserie() };
    await montar();
    const [, b] = (mockSesion.data as { exercises: never[] }).exercises;
    await llamar('e2', 'onToggle', b, serie(40, 12, { id: 's2' }));
    expect(useGymStore.getState().rest?.durationSec).toBe(150);
  });
});

describe('Modo serio (RF-F55)', () => {
  it('sin celebración en el bloque ni frase al terminar un drop', async () => {
    useGymStore.setState({ seriousMode: true });
    await montar();
    expect(mockProps.e1?.celebrate).toBe(false);
    const ex = (mockSesion.data as { exercises: never[] }).exercises[0];
    const conDrop = serie(100, 8, { id: 's1', segments: [...serie(100, 8).segments, { ...serie(80, 6).segments[0], kind: 'drop', sort_order: 1 }] });
    await llamar('e1', 'onToggle', ex, conDrop);
    expect(mockSnackbar).not.toHaveBeenCalled();
    useGymStore.setState({ seriousMode: false });
  });

  it('sin Modo serio, el drop terminado sí trae su frase', async () => {
    useGymStore.setState({ seriousMode: false });
    await montar();
    expect(mockProps.e1?.celebrate).toBe(true);
    const ex = (mockSesion.data as { exercises: never[] }).exercises[0];
    const conDrop = serie(100, 8, { id: 's1', segments: [...serie(100, 8).segments, { ...serie(80, 6).segments[0], kind: 'drop', sort_order: 1 }] });
    await llamar('e1', 'onToggle', ex, conDrop);
    expect(mockSnackbar).toHaveBeenCalled();
  });
});

describe('drop mecánico (RF-F44)', () => {
  it('aplicarlo abre la hoja de variante en el último tramo drop; "Sin variante" la quita; se deshace', async () => {
    await montar();
    await llamar('e1', 'onSetMenu', (mockSesion.data as { exercises: never[] }).exercises[0], serie(100, 8, { id: 's1' }));
    await fireEvent.press(screen.getByLabelText(/Intensificador/i));
    await llamar('intensificadores', 'onToggle', 'mechanical_drop', true);

    const conDrop = ultimoGuardado();
    const ultimoDrop = conDrop.segments.map((g) => g.kind).lastIndexOf('drop');
    expect(ultimoDrop).toBeGreaterThan(0);
    expect(mockProps.variante?.visible).toBe(true);

    // La pantalla ve la serie con el drop (como haría la cola local) antes de elegir.
    mockSesion = { ...mockSesion, data: sesion({ exercises: [ejercicio({ workout_sets: [conDrop] })] }) };
    await screen.rerender(<QueryClientProvider client={new QueryClient()}><Pantalla /></QueryClientProvider>);
    await llamar('variante', 'onPick', 'cat-otra');
    expect(ultimoGuardado().segments[ultimoDrop]?.variant_exercise_id).toBe('cat-otra');
    // Deshacer regresa el tramo a como estaba: sin variante.
    await fireEvent.press(screen.getByLabelText('Deshacer'));
    expect(ultimoGuardado().segments[ultimoDrop]?.variant_exercise_id).toBeNull();

    // "Sin variante" sobre una que ya tenía la quita.
    const conVariante = { ...conDrop, segments: conDrop.segments.map((g, i) => (i === ultimoDrop ? { ...g, variant_exercise_id: 'cat-otra' } : g)) };
    mockSesion = { ...mockSesion, data: sesion({ exercises: [ejercicio({ workout_sets: [conVariante] })] }) };
    await screen.rerender(<QueryClientProvider client={new QueryClient()}><Pantalla /></QueryClientProvider>);
    expect(mockProps.variante?.currentId).toBe('cat-otra');
    await llamar('variante', 'onPick', null);
    expect(ultimoGuardado().segments[ultimoDrop]?.variant_exercise_id).toBeNull();
  });
});
