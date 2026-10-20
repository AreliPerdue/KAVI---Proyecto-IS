/**
 * La sesión en vivo de un club (spec 13f, RF-BC10 – RF-BC14; T309): empezar avisa a los demás; quien sigue llega
 * a donde va quien dirige y deja de moverse al soltarse; señalar solo llega de quien dirige; si quien dirige se va,
 * el mando pasa a quien lleva más tiempo.
 */
import { act, renderHook } from '@testing-library/react-native';

import { useClubLive } from '@/hooks/use-club-live';
import type { EventosEnVivo } from '@/services/contracts';
import type { PresenteEnVivo } from '@/types/domain';

const mockEstado = jest.fn();
const mockMover = jest.fn();
const mockSenalar = jest.fn();
const mockMando = jest.fn();
const mockAvisar = jest.fn();
let mockEventos: EventosEnVivo | null = null;
jest.mock('@/services/club-live', () => ({
  entrarEnVivo: (_club: string, _yo: unknown, eventos: EventosEnVivo) => {
    mockEventos = eventos;
    return { estado: mockEstado, mover: mockMover, senalar: mockSenalar, pasarMando: mockMando, salir: jest.fn() };
  },
  avisarEnVivo: (...a: unknown[]) => mockAvisar(...a),
}));

const p = (id: string, desde: number, extra: Partial<PresenteEnVivo> = {}): PresenteEnVivo => ({ id, nombre: id, desde, enSesion: true, dirige: false, ...extra });

async function montar() {
  const alMover = jest.fn();
  const alSenalar = jest.fn();
  const r = await renderHook(() => useClubLive({ clubId: 'c1', yo: { id: 'yo', nombre: 'Areli' }, libro: 'Rayuela', alMover, alSenalar }));
  return { ...r, alMover, alSenalar };
}

beforeEach(() => {
  for (const m of [mockEstado, mockMover, mockSenalar, mockMando, mockAvisar]) m.mockReset();
});

it('empezar me deja dirigiendo y avisa a los demás del club', async () => {
  const { result } = await montar();
  await act(async () => result.current.empezar());
  expect(mockEstado).toHaveBeenLastCalledWith(expect.objectContaining({ enSesion: true, dirige: true }));
  expect(mockAvisar).toHaveBeenCalledWith('c1', { quien: 'Areli', libro: 'Rayuela' });
});

it('quien dirige manda su lugar al moverse (sin repetir el mismo)', async () => {
  const { result } = await montar();
  await act(async () => result.current.empezar());
  await act(async () => mockEventos?.onPresentes([p('yo', 1, { dirige: true })]));
  await act(async () => result.current.moverme({ page: 40 }));
  await act(async () => result.current.moverme({ page: 40 }));
  expect(mockMover).toHaveBeenCalledTimes(1);
  expect(mockMover).toHaveBeenCalledWith({ page: 40 });
});

it('al unirme llego a donde va Ana; la sigo hasta que me suelto, y "Seguir" me regresa', async () => {
  const { result, alMover } = await montar();
  await act(async () => mockEventos?.onPresentes([p('ana', 1, { dirige: true, pos: { page: 12 } }), p('yo', 2, { enSesion: false })]));
  expect(result.current.hay).toBe(true);
  await act(async () => result.current.unirme());
  expect(alMover).toHaveBeenLastCalledWith({ page: 12 });
  await act(async () => mockEventos?.onMover({ page: 13 }, 'ana'));
  expect(alMover).toHaveBeenLastCalledWith({ page: 13 });
  // Lo que manda alguien que no dirige no me mueve.
  await act(async () => mockEventos?.onMover({ page: 99 }, 'luis'));
  expect(alMover).not.toHaveBeenCalledWith({ page: 99 });
  await act(async () => result.current.soltarme());
  await act(async () => mockEventos?.onMover({ page: 14 }, 'ana'));
  expect(alMover).not.toHaveBeenCalledWith({ page: 14 });
  await act(async () => result.current.seguir());
  expect(alMover).toHaveBeenLastCalledWith({ page: 12 });
});

it('si Ana se va, el mando pasa a quien lleva más tiempo: yo, y lo digo', async () => {
  const { result } = await montar();
  await act(async () => mockEventos?.onPresentes([p('ana', 1, { dirige: true }), p('yo', 2, { enSesion: false })]));
  await act(async () => result.current.unirme());
  await act(async () => mockEventos?.onPresentes([p('yo', 2), p('luis', 3)]));
  expect(result.current.yoDirijo).toBe(true);
  expect(mockEstado).toHaveBeenLastCalledWith(expect.objectContaining({ dirige: true }));
});

it('pasarme el mando me deja dirigiendo; señalar solo llega de quien dirige', async () => {
  const { result, alSenalar } = await montar();
  await act(async () => mockEventos?.onPresentes([p('ana', 1, { dirige: true }), p('yo', 2, { enSesion: false })]));
  await act(async () => result.current.unirme());
  await act(async () => mockEventos?.onSenalar({ page: 3 }, 'luis'));
  expect(alSenalar).not.toHaveBeenCalled();
  await act(async () => mockEventos?.onSenalar({ page: 3 }, 'ana'));
  expect(alSenalar).toHaveBeenCalledWith({ page: 3 });
  await act(async () => mockEventos?.onMando('yo', 'ana'));
  expect(mockEstado).toHaveBeenLastCalledWith(expect.objectContaining({ enSesion: true, dirige: true }));
});
