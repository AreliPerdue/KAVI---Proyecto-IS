/**
 * Detalle de un ejercicio (RF-F26): mejor serie (por e1RM, sin calentamiento ni series sin
 * marcar), peso más alto, y las gráficas —con una sesión solo se explica que falta otra; con
 * dos o más se dibuja la tendencia—.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { es } from '@/i18n/es';
import { delCatalogo, serie } from '@/lib/gym/__tests__/fixtures';
import { useGymStore } from '@/store/gym-store';

const X = es.fitness.exercise;
const BANCA = delCatalogo('banca', { name_es: 'Press de banca', name_en: 'Bench press', primary_muscles: ['chest_mid'], equipment: ['barbell'] });
let mockHistorial: unknown[] = [];

jest.mock('@/hooks/use-exercises', () => ({
  useExercises: () => ({ data: [mockBanca()], isPending: false, refetch: jest.fn() }),
  useExercisePrefs: () => ({ data: [] }),
  useExerciseMutations: () => ({ saveStickyNote: { mutate: jest.fn() } }),
}));
function mockBanca() {
  return BANCA;
}
jest.mock('@/hooks/use-exercise-history', () => ({ useExerciseHistory: () => ({ data: mockHistorial, isPending: false }) }));

/* eslint-disable-next-line @typescript-eslint/no-require-imports -- tras los mocks */
const Pantalla = require('@/app/(app)/exercise/[id]').default as () => React.ReactElement;

/** El historial llega del más reciente al más viejo, como lo da el servicio. */
const sesion = (id: string, fecha: string, sets: unknown[]) => ({ workout_id: id, workout_exercise_id: `we-${id}`, performed_at: fecha, bodyweight_kg: null, sets });

beforeEach(() => {
  useGymStore.setState({ weightUnit: 'kg', e1rmFormula: 'epley' });
  globalThis.setParametrosDeRuta({ id: 'banca' });
});

it('sin series hechas invita a registrar', async () => {
  mockHistorial = [sesion('w1', '2026-10-01T10:00:00Z', [serie(100, 5, { completed_at: null })])];
  await render(<Pantalla />);
  expect(screen.getByText(X.noSetsTitle)).toBeTruthy();
});

it('mejor serie y peso máximo, sin contar calentamiento ni lo no marcado', async () => {
  mockHistorial = [
    sesion('w2', '2026-10-03T10:00:00Z', [serie(140, 1, { set_type: 'warmup' }), serie(100, 8), serie(150, 1, { completed_at: null })]),
    sesion('w1', '2026-10-01T10:00:00Z', [serie(110, 3)]),
  ];
  await render(<Pantalla />);
  // e1RM Epley: 100×8 ≈ 126.7; 110×3 = 121. Gana 100×8 aunque 110 sea más peso.
  expect(screen.getAllByText('100 × 8').length).toBeGreaterThan(0);
  expect(screen.getByText(/^≈ 126\.7 kg .*3 oct$/)).toBeTruthy();
  expect(screen.getByText('110 kg')).toBeTruthy();
  expect(screen.getByText(X.sessionsCount(2))).toBeTruthy();
});

it('con una sola sesión, las gráficas explican que falta otra', async () => {
  mockHistorial = [sesion('w1', '2026-10-01T10:00:00Z', [serie(100, 5)])];
  await render(<Pantalla />);
  expect(screen.getAllByText(es.fitness.chart.needsTwo)).toHaveLength(2);
});

it('con dos o más se dibuja la tendencia', async () => {
  mockHistorial = [sesion('w2', '2026-10-03T10:00:00Z', [serie(105, 5)]), sesion('w1', '2026-10-01T10:00:00Z', [serie(100, 5)])];
  await render(<Pantalla />);
  expect(screen.queryByText(es.fitness.chart.needsTwo)).toBeNull();
  expect(screen.getByText(X.estimateChart)).toBeTruthy();
  expect(screen.getByText(X.volumeChart)).toBeTruthy();
});

it('cada sesión abre su registro en lectura', async () => {
  mockHistorial = [sesion('w1', '2026-10-01T10:00:00Z', [serie(100, 5)])];
  await render(<Pantalla />);
  await fireEvent.press(screen.getByRole('button', { name: /^Abrir la sesión del / }));
  expect(globalThis.mockRouter.push).toHaveBeenCalledWith({ pathname: '/(app)/workout/[id]', params: { id: 'w1', mode: 'view' } });
});
