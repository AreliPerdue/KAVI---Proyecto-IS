/**
 * Modo serio (RF-F55): apaga todo el humor. En el resumen no hay frase ni equivalencia de
 * tonelaje, y Fitness no pregunta "¿y la pierna?". Las cifras se quedan igual.
 */
import { render, renderHook, screen } from '@testing-library/react-native';

import { SessionSummarySheet } from '@/components/fitness/session-summary';
import { useNoLegsLine } from '@/components/fitness/streak-card';
import { CATALOGO, ejercicio, serie, sesion } from '@/lib/gym/__tests__/fixtures';
import { useGymStore } from '@/store/gym-store';
import type { WorkoutDetail } from '@/services/workouts';

const mockAhora = new Date();
const ayer = new Date(mockAhora.getTime() - 86_400_000);
let mockSesiones: unknown[] = [];

jest.mock('@/hooks/use-gym-progress', () => ({
  useGymProgress: () => ({ sessions: mockSesiones, catalog: mockCatalogo(), now: mockAhora, streak: null }),
}));
function mockCatalogo() {
  return CATALOGO;
}
jest.mock('@/providers', () => ({ useSnackbar: () => jest.fn() }));

/** Solo banca: un día de empuje, sin pierna. */
const empuje = () => sesion(ayer, [ejercicio('banca', [serie(100, 10), serie(100, 10), serie(100, 10)])], { id: 'w-empuje' });
const RESUMEN = { durationMin: 60, volumeKg: 3000, setsDone: 3, setsPending: 0, prCount: 0 };

const resumen = async () => {
  const w = { ...empuje(), title: 'Empuje', activity_title: null } as unknown as WorkoutDetail;
  await render(<SessionSummarySheet visible workout={w} summary={RESUMEN} catalog={CATALOGO} unit="kg" onClose={jest.fn()} />);
};
/** La equivalencia es la única línea que empieza con el volumen y un "=". */
const equivalencia = () => screen.queryByText(/^3,?000 kg = /);

beforeEach(() => {
  mockSesiones = [empuje()];
});
afterEach(() => useGymStore.setState({ seriousMode: false }));

it('sin Modo serio el resumen trae frase y equivalencia; "¿y la pierna?" aparece', async () => {
  useGymStore.setState({ seriousMode: false });
  await resumen();
  expect(equivalencia()).toBeTruthy();
  const { result } = await renderHook(() => useNoLegsLine());
  expect(result.current).not.toBeNull();
});

it('con Modo serio: sin equivalencia, sin frase y sin "¿y la pierna?"; las cifras siguen', async () => {
  useGymStore.setState({ seriousMode: true });
  await resumen();
  expect(equivalencia()).toBeNull();
  expect(screen.getByText('60 min')).toBeTruthy();
  const { result } = await renderHook(() => useNoLegsLine());
  expect(result.current).toBeNull();
});
