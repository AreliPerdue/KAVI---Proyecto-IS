/**
 * Timer de descanso y de intervalos (spec 07 v2, RF-F34, RF-F46). El tiempo se calcula desde la
 * hora de fin o de inicio, no restando de un contador, así que se prueba moviendo el reloj.
 */
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { IntervalTimerSheet } from '@/components/fitness/interval-timer-sheet';
import { RestTimerBar } from '@/components/fitness/rest-timer-bar';
import { useGymStore } from '@/store/gym-store';

const mockSonar = jest.fn();
jest.mock('@/lib/sounds', () => ({ playSound: (s: string) => mockSonar(s) }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), success: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ scheduleRestEnd: async () => true, cancelRestEnd: async () => undefined }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 7, 18, 0, 0));
  mockSonar.mockClear();
  useGymStore.setState({ rest: null, timerSound: true, seriousMode: true });
});
afterEach(() => jest.useRealTimers());

/** En pasos de 250 ms, como corre el reloj en pantalla: un solo salto juntaría todos los repintados. */
const avanzar = async (ms: number) => {
  for (let t = 0; t < ms; t += 250) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(250, ms - t));
    });
  }
};

describe('RestTimerBar', () => {
  it('muestra lo que falta y lo que sigue', async () => {
    useGymStore.getState().startRest('w1', 90, 'Banca, serie 2');
    await render(<RestTimerBar workoutId="w1" />);
    expect(screen.getByText('1:30')).toBeTruthy();
    expect(screen.getByText('Sigue: Banca, serie 2')).toBeTruthy();
  });

  it('el descanso de otra sesión no se muestra aquí', async () => {
    useGymStore.getState().startRest('otra', 90);
    await render(<RestTimerBar workoutId="w1" />);
    expect(screen.queryByText('1:30')).toBeNull();
  });

  it('pita en 3, 2 y 1, y al terminar suena el de fin', async () => {
    useGymStore.getState().startRest('w1', 5);
    await render(<RestTimerBar workoutId="w1" />);
    await avanzar(5_500);
    expect(mockSonar.mock.calls.filter(([s]) => s === 'tick').length).toBe(3);
    expect(mockSonar).toHaveBeenCalledWith('done');
    expect(screen.getByText('Se acabó el descanso')).toBeTruthy();
  });

  it('al terminar se queda unos segundos y se va solo a los 8 s', async () => {
    useGymStore.getState().startRest('w1', 1);
    await render(<RestTimerBar workoutId="w1" />);
    await avanzar(1_500);
    expect(useGymStore.getState().rest).not.toBeNull();
    await avanzar(8_000);
    expect(useGymStore.getState().rest).toBeNull();
  });

  it('un descanso que terminó hace rato (app cerrada) no suena al abrir', async () => {
    useGymStore.setState({ rest: { endsAt: Date.now() - 60_000, durationSec: 90, workoutId: 'w1', label: null } });
    await render(<RestTimerBar workoutId="w1" />);
    await avanzar(600);
    expect(mockSonar).not.toHaveBeenCalledWith('done');
  });

  it('±15 s desde la barra', async () => {
    useGymStore.getState().startRest('w1', 90);
    await render(<RestTimerBar workoutId="w1" />);
    await fireEvent.press(screen.getByLabelText('Sumar 15 segundos'));
    expect(useGymStore.getState().rest?.durationSec).toBe(105);
  });
});

describe('IntervalTimerSheet', () => {
  const tabata = { workSec: 20, restSec: 10, rounds: 2 };

  it('antes de empezar, listo en la ronda 1', async () => {
    await render(<IntervalTimerSheet visible title="Tabata" config={tabata} onClose={jest.fn()} />);
    expect(screen.getByText('Listo para empezar')).toBeTruthy();
    expect(screen.getByText('Ronda 1 de 2')).toBeTruthy();
  });

  it('pasa por trabajo y descanso, cuenta rondas y termina', async () => {
    await render(<IntervalTimerSheet visible title="Tabata" config={tabata} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText('Empezar'));
    expect(screen.getByText('Trabajo')).toBeTruthy();
    await avanzar(21_000);
    expect(screen.getByText('Descanso')).toBeTruthy();
    await avanzar(10_000);
    expect(screen.getByText('Ronda 2 de 2')).toBeTruthy();
    await avanzar(20_000);
    expect(screen.getAllByText('Terminado').length).toBeGreaterThan(0);
  });

  it('pita en cada cambio de fase y con otro sonido al final', async () => {
    await render(<IntervalTimerSheet visible title="Tabata" config={tabata} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText('Empezar'));
    await avanzar(51_000);
    // Trabajo → descanso → trabajo (la última ronda no lleva descanso) → fin.
    expect(mockSonar.mock.calls.map(([s]) => s)).toEqual(['tick', 'tick', 'done']);
  });
});
