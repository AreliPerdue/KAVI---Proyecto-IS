/**
 * El cronómetro del lector (spec 13b, RF-BR11 – RF-BR12; T318): guarda la sesión cada minuto y al salir,
 * pausa en segundo plano y no guarda los vistazos de menos de un minuto.
 */
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { crearWrapper } from '@/hooks/__tests__/query-wrapper';
import { useReadingTimer } from '@/hooks/use-reading-sessions';

const mockEncolar = jest.fn(async (_e: unknown) => undefined);
jest.mock('@/providers', () => ({ useAuth: () => ({ userId: 'u1' }) }));
jest.mock('@/hooks/use-library-sync', () => ({ subirPendientes: async () => undefined }));
jest.mock('@/services/library', () => ({ listReadingSessions: async () => [] }));
jest.mock('@/lib/library/offline/outbox', () => ({ encolar: (e: unknown) => mockEncolar(e), pendientes: async () => [] }));

let alCambiar: ((estado: string) => void) | null = null;
const MIN = 60_000;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-14T10:00:00Z') });
  mockEncolar.mockClear();
  alCambiar = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, cb) => {
    alCambiar = cb as (estado: string) => void;
    return { remove: jest.fn() } as never;
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const sesiones = () => mockEncolar.mock.calls.map(([e]) => (e as { session: { seconds: number; id: string } }).session);

/** Leer `minutos` dando una señal cada 30 s. */
async function leer(actividad: () => void, minutos: number) {
  for (let i = 0; i < minutos * 2; i++) {
    await act(async () => {
      jest.advanceTimersByTime(30_000);
      actividad();
    });
  }
}

it('guarda la sesión cada minuto con lo leído, siempre con el mismo id', async () => {
  const { Wrapper } = crearWrapper();
  const { result } = await renderHook(() => useReadingTimer('l1', true), { wrapper: Wrapper });
  await leer(() => result.current.actividad(), 3);
  const guardadas = sesiones();
  expect(guardadas.length).toBeGreaterThanOrEqual(2);
  expect(new Set(guardadas.map((s) => s.id)).size).toBe(1);
  expect(guardadas.at(-1)?.seconds).toBeGreaterThanOrEqual(150);
});

it('en segundo plano pausa (y guarda); el tiempo afuera no se suma', async () => {
  const { Wrapper } = crearWrapper();
  const { result } = await renderHook(() => useReadingTimer('l1', true), { wrapper: Wrapper });
  await leer(() => result.current.actividad(), 2);
  await act(async () => alCambiar?.('background'));
  const alPausar = sesiones().at(-1)?.seconds ?? 0;
  expect(alPausar).toBe(120);
  await act(async () => jest.advanceTimersByTime(30 * MIN));
  await act(async () => alCambiar?.('active'));
  await leer(() => result.current.actividad(), 1);
  await act(async () => alCambiar?.('background'));
  expect(sesiones().at(-1)?.seconds).toBe(180);
});

it('al salir guarda; un vistazo de menos de un minuto no', async () => {
  const { Wrapper } = crearWrapper();
  const { result, unmount } = await renderHook(() => useReadingTimer('l1', true), { wrapper: Wrapper });
  await leer(() => result.current.actividad(), 0.5);
  await act(async () => unmount());
  expect(mockEncolar).not.toHaveBeenCalled();
});

it('sin abrir el libro no cuenta nada', async () => {
  const { Wrapper } = crearWrapper();
  const { unmount } = await renderHook(() => useReadingTimer('l1', false), { wrapper: Wrapper });
  await act(async () => jest.advanceTimersByTime(5 * MIN));
  await act(async () => unmount());
  expect(mockEncolar).not.toHaveBeenCalled();
});

it('la sesión dice de dónde a dónde se leyó, aunque la primera posición llegue antes de abrir', async () => {
  const { Wrapper } = crearWrapper();
  const { result, rerender } = await renderHook(({ abierto }: { abierto: boolean }) => useReadingTimer('l1', abierto), { wrapper: Wrapper, initialProps: { abierto: false } });
  await act(async () => result.current.alMoverse({ locator: { page: 3 }, progress: 0.3 }));
  await rerender({ abierto: true });
  await leer(() => result.current.actividad(), 1);
  await act(async () => result.current.alMoverse({ locator: { page: 9 }, progress: 0.9 }));
  await act(async () => alCambiar?.('background'));
  expect(mockEncolar.mock.calls.at(-1)?.[0]).toMatchObject({ session: { start_locator: { page: 3 }, end_locator: { page: 9 }, start_progress: 0.3, end_progress: 0.9 } });
});
