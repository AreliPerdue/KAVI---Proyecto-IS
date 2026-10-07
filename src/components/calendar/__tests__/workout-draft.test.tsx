/**
 * Borrador del entrenamiento en el formulario de actividad (RF-F9, T251). Reescrita: la de v1
 * probaba tarjetas de texto; ahora el borrador usa los mismos bloques que el logger.
 *
 * El bloque, el selector y el teclado son dobles que guardan sus props (cada uno tiene su
 * propia prueba); aquí se comprueba lo que hace el borrador con lo que le avisan.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { type ExerciseDraft, WorkoutDraft } from '@/components/calendar/workout-draft';
import { es } from '@/i18n/es';
import { delCatalogo, serie } from '@/lib/gym/__tests__/fixtures';
import { useGymStore } from '@/store/gym-store';

const D = es.fitness.draft;
const W = es.fitness.workout;
const BANCA = delCatalogo('banca', { name_es: 'Press de banca' });
const SENTADILLA = delCatalogo('sentadilla', { name_es: 'Sentadilla' });
const mockProps: Record<string, Record<string, (...a: unknown[]) => unknown> & Record<string, unknown>> = {};
let mockElegir: unknown = BANCA;

jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/hooks/use-exercises', () => ({
  useExercises: () => ({ data: [mockCatalogo()[0], mockCatalogo()[1]] }),
  useExercisePrefs: () => ({ data: [] }),
}));
function mockCatalogo() {
  return [BANCA, SENTADILLA];
}
/** La vez pasada de la banca: 80 × 10. */
jest.mock('@/hooks/use-exercise-history', () => ({
  exerciseHistoryQuery: (_u: string, ref: { exerciseId: string | null }) => ({
    queryKey: ['historial', ref.exerciseId],
    queryFn: async () => (ref.exerciseId === 'banca' ? [{ workout_id: 'w0', workout_exercise_id: 'we0', performed_at: '2026-10-01T10:00:00Z', bodyweight_kg: null, sets: [mockSerieAnterior()] }] : []),
  }),
}));
function mockSerieAnterior() {
  return serie(80, 10, { id: 'previa' });
}
jest.mock('@/components/fitness/exercise-block', () => ({
  ...jest.requireActual('@/components/fitness/exercise-block'),
  ExerciseBlock: (p: { exercise: { exercise_id: string } }) => { mockProps[p.exercise.exercise_id] = p as never; return null; },
}));
jest.mock('@/components/fitness/exercise-picker', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- fábrica elevada */
  const { Pressable, Text } = require('react-native');
  return {
    ExercisePicker: (p: { visible: boolean; onPick: (e: unknown) => void }) =>
      p.visible ? <Pressable accessibilityRole="button" accessibilityLabel="elegir del catálogo" onPress={() => p.onPick(mockElegir)}><Text>elegir</Text></Pressable> : null,
  };
});
jest.mock('@/components/fitness/numpad-sheet', () => ({
  NumpadSheet: (p: Record<string, unknown>) => { mockProps.teclado = p as never; return null; },
}));

/** Como en el formulario: el borrador vive arriba y se pasa de vuelta. */
let ultimo: ExerciseDraft[] = [];
function Arnes({ inicial = [] as ExerciseDraft[], existente }: { inicial?: ExerciseDraft[]; existente?: { count: number; onOpen: () => void } }) {
  const [ejercicios, setEjercicios] = useState(inicial);
  return (
    <WorkoutDraft
      exercises={ejercicios}
      onChange={(nuevos) => {
        ultimo = nuevos;
        setEjercicios(nuevos);
      }}
      existingCount={existente?.count}
      onOpenExisting={existente?.onOpen}
    />
  );
}
const montar = (props: Parameters<typeof Arnes>[0] = {}) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}>
      <Arnes {...props} />
    </QueryClientProvider>,
  );
const llamar = (doble: string, prop: string, ...args: unknown[]) => act(async () => { await (mockProps[doble]?.[prop] as (...a: unknown[]) => unknown)(...args); });
const banca = () => ultimo.find((e) => e.exercise_id === 'banca') as ExerciseDraft;
const reps = (s: { segments: { reps: number | null }[] }) => s.segments[0]?.reps;

/** Agrega la banca y espera a que nazca su primera serie. */
const conBanca = async () => {
  await montar();
  await fireEvent.press(screen.getByRole('button', { name: D.addExercise }));
  await fireEvent.press(screen.getByRole('button', { name: 'elegir del catálogo' }));
  await waitFor(() => expect(banca()?.workout_sets).toHaveLength(1));
};

beforeEach(() => {
  ultimo = [];
  for (const k of Object.keys(mockProps)) delete mockProps[k];
  mockElegir = BANCA;
  useGymStore.setState({ weightUnit: 'kg', effortScale: 'rir' });
});

it('vacío invita a añadir', async () => {
  await montar();
  expect(screen.getByText(D.intro)).toBeTruthy();
  expect(screen.getByRole('button', { name: D.addExercise })).toBeTruthy();
});

it('elegir del catálogo crea el ejercicio ligado, con su primera serie prellenada con la vez pasada', async () => {
  await conBanca();
  expect(banca()).toEqual(expect.objectContaining({ name: 'Press de banca', exercise_id: 'banca', position: 0 }));
  const primera = banca().workout_sets[0]!;
  expect(primera.segments[0]?.weight_kg).toBe(80);
  expect(reps(primera)).toBe(10);
  expect(primera.completed_at).toBeNull();
  expect(screen.getByRole('button', { name: D.addAnother })).toBeTruthy();
});

it('el teclado escribe en la serie al cerrarse', async () => {
  await conBanca();
  const set = banca().workout_sets[0]!;
  await llamar('banca', 'onEdit', { setId: set.id, segmentIndex: 0, field: 'weight_kg' });
  await llamar('teclado', 'onChange', 90);
  await llamar('teclado', 'onClose');
  expect(banca().workout_sets[0]?.segments[0]?.weight_kg).toBe(90);
});

it('+ Serie copia la anterior; duplicar la pone justo después; borrar la quita', async () => {
  await conBanca();
  await llamar('banca', 'onAddSet', banca());
  expect(banca().workout_sets).toHaveLength(2);
  expect(banca().workout_sets[1]?.segments[0]?.weight_kg).toBe(80);

  const [a, b] = banca().workout_sets;
  await llamar('banca', 'onDuplicate', banca(), a);
  const orden = banca().workout_sets.map((s) => s.sort_order);
  expect(banca().workout_sets).toHaveLength(3);
  expect(orden[1]).toBeGreaterThan(a!.sort_order);
  expect(orden[1]).toBeLessThan(b!.sort_order);

  await llamar('banca', 'onDelete', banca(), b);
  expect(banca().workout_sets.map((s) => s.id)).not.toContain(b!.id);
});

it('arrastrar la última al inicio le da un orden antes de la primera', async () => {
  await conBanca();
  await llamar('banca', 'onAddSet', banca());
  const ultima = banca().workout_sets[1]!;
  await llamar('banca', 'onMoveSet', banca(), 1, 0);
  expect(banca().workout_sets[0]?.id).toBe(ultima.id);
});

it('cambiar el ejercicio lo liga al nuevo; quitarlo renumera las posiciones', async () => {
  await conBanca();
  mockElegir = SENTADILLA;
  await fireEvent.press(screen.getByRole('button', { name: D.addAnother }));
  await fireEvent.press(screen.getByRole('button', { name: 'elegir del catálogo' }));
  expect(ultimo.map((e) => [e.exercise_id, e.position])).toEqual([['banca', 0], ['sentadilla', 1]]);

  // Quitar la banca: la sentadilla pasa a la posición 0.
  await llamar('banca', 'onExerciseMenu', banca());
  await fireEvent.press(screen.getByRole('button', { name: W.removeExercise }));
  expect(ultimo.map((e) => [e.exercise_id, e.position])).toEqual([['sentadilla', 0]]);

  // Cambiar la sentadilla por la banca.
  mockElegir = BANCA;
  await llamar('sentadilla', 'onExerciseMenu', ultimo[0]);
  await fireEvent.press(screen.getByRole('button', { name: W.changeExercise }));
  await fireEvent.press(screen.getByRole('button', { name: 'elegir del catálogo' }));
  expect(ultimo).toEqual([expect.objectContaining({ exercise_id: 'banca', name: 'Press de banca' })]);
});

it('con un entrenamiento ya guardado ofrece abrirlo en vez de duplicarlo', async () => {
  const onOpen = jest.fn();
  await montar({ existente: { count: 2, onOpen } });
  expect(screen.getByText(D.existingWith(2))).toBeTruthy();
  expect(screen.queryByRole('button', { name: D.addExercise })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: D.openExisting }));
  expect(onOpen).toHaveBeenCalled();
});
