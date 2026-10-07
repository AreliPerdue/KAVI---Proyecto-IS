import { useGymStore } from '@/store/gym-store';

/**
 * Timer de descanso (spec 07 v2, RF-F34): se guarda como hora de fin, no como segundos, para que
 * siga corriendo aunque la app se duerma, y su aviso del sistema se reprograma con cada ajuste.
 */
const mockProgramar = jest.fn(async () => true);
const mockCancelar = jest.fn(async () => undefined);
jest.mock('@/lib/notifications', () => ({
  scheduleRestEnd: (...a: unknown[]) => mockProgramar(...(a as [])),
  cancelRestEnd: () => mockCancelar(),
}));


beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 7, 18, 0, 0));
  mockProgramar.mockClear();
  mockCancelar.mockClear();
  useGymStore.setState({ rest: null, seriousMode: true, trato: 'neutral' });
});
afterEach(() => jest.useRealTimers());

describe('descanso', () => {
  it('se calcula desde la hora de fin', () => {
    useGymStore.getState().startRest('w1', 90, 'Banca, serie 2');
    const { rest } = useGymStore.getState();
    expect(rest).toMatchObject({ endsAt: Date.now() + 90_000, durationSec: 90, workoutId: 'w1' });
  });

  it('programa el aviso del sistema para la hora de fin, con lo que sigue', () => {
    useGymStore.getState().startRest('w1', 90, 'Banca, serie 2');
    expect(mockProgramar).toHaveBeenCalledWith(new Date(Date.now() + 90_000), 'Se acabó el descanso', 'Sigue: Banca, serie 2');
  });

  it('±15 s mueve la hora de fin y reprograma el aviso', () => {
    useGymStore.getState().startRest('w1', 90);
    useGymStore.getState().adjustRest(15);
    expect(useGymStore.getState().rest?.endsAt).toBe(Date.now() + 105_000);
    useGymStore.getState().adjustRest(-15);
    useGymStore.getState().adjustRest(-15);
    expect(useGymStore.getState().rest?.endsAt).toBe(Date.now() + 75_000);
    expect(mockProgramar).toHaveBeenCalledTimes(4);
  });

  it('restar no lo deja en el pasado', () => {
    useGymStore.getState().startRest('w1', 10);
    useGymStore.getState().adjustRest(-15);
    expect(useGymStore.getState().rest?.endsAt).toBe(Date.now());
  });

  it('empezar otro reemplaza al anterior', () => {
    useGymStore.getState().startRest('w1', 90);
    useGymStore.getState().startRest('w1', 60);
    expect(useGymStore.getState().rest?.durationSec).toBe(60);
  });

  it('terminarlo cancela el aviso', () => {
    useGymStore.getState().startRest('w1', 90);
    useGymStore.getState().stopRest();
    expect(useGymStore.getState().rest).toBeNull();
    expect(mockCancelar).toHaveBeenCalled();
  });
});
