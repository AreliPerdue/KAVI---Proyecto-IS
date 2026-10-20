/** La sesión en vivo en el demo (13f, T309): los simulados llegan a seguirte, toman el mando y se quedan si dirigen. */
import { demoClubLive } from '@/services/demo/club-live';
import type { PresenteEnVivo } from '@/types/domain';

jest.mock('@/services/demo/library', () => ({
  miembrosDelDemo: () => [
    { club_id: 'c1', person_id: 'yo', status: 'accepted' },
    { club_id: 'c1', person_id: 'ana', status: 'accepted' },
    { club_id: 'c1', person_id: 'luis', status: 'pending' },
  ],
}));
jest.mock('@/services/demo/store', () => ({ demoState: { accounts: [{ user: { id: 'ana' }, profile: { display_name: 'Ana Torres' } }] } }));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function entrar() {
  let presentes: PresenteEnVivo[] = [];
  const s = demoClubLive.entrar('c1', { id: 'yo', nombre: 'Areli' }, { onPresentes: (p) => (presentes = p), onMover: jest.fn(), onSenalar: jest.fn(), onMando: jest.fn() });
  return { s, ahora: () => presentes };
}

it('al empezar, los aceptados llegan al rato a seguirme', () => {
  const { s, ahora } = entrar();
  s.estado({ enSesion: true, dirige: true, desde: 1 });
  expect(ahora().map((p) => p.id)).toEqual(['yo']);
  jest.advanceTimersByTime(1300);
  expect(ahora().map((p) => [p.id, p.nombre, p.dirige])).toEqual([['yo', 'Areli', true], ['ana', 'Ana Torres', false]]);
});

it('si le paso el mando a Ana, lo toma y se queda aunque yo salga; si dirijo y salgo, se van conmigo', () => {
  const { s, ahora } = entrar();
  s.estado({ enSesion: true, dirige: true, desde: 1 });
  jest.advanceTimersByTime(1300);
  s.pasarMando('ana');
  s.estado({ enSesion: true, dirige: false, desde: 1 });
  expect(ahora().find((p) => p.id === 'ana')?.dirige).toBe(true);
  s.estado({ enSesion: false, dirige: false, desde: 1 });
  expect(ahora().map((p) => p.id)).toEqual(['yo', 'ana']);

  const otra = entrar();
  otra.s.estado({ enSesion: true, dirige: true, desde: 1 });
  jest.advanceTimersByTime(1300);
  otra.s.estado({ enSesion: false, dirige: false, desde: 1 });
  expect(otra.ahora().map((p) => p.id)).toEqual(['yo']);
});
