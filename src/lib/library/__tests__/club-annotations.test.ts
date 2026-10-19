/** Anotar juntos en un club (spec 13f, RF-BC6 – RF-BC7; T307): autoría, colores y la capa del club. */
import { autoresDelClub, autoria, colorDeMiembro, conCapaDelClub, esDeOtroEnElClub } from '@/lib/library/club-annotations';
import type { LibraryClubMember } from '@/types/domain';

const T = { by: (n: string) => `De ${n}`, mine: 'Tuya', changedBy: (n: string) => `la cambió ${n}`, someone: 'alguien' };
const miembro = (person_id: string, display_name: string | null): LibraryClubMember => ({
  club_id: 'c1', person_id, status: 'accepted', item_id: null, shows_progress: true, invited_by: null, created_at: 'c', joined_at: null,
  profile: { display_name, username: 'x', avatar_url: null },
});

it('el color de un miembro: el que le doy como contacto o uno fijo por su id', () => {
  expect(colorDeMiembro('u-ana', new Map([['u-ana', '#E24947']]))).toBe('#E24947');
  expect(colorDeMiembro('u-luis', new Map())).toBe(colorDeMiembro('u-luis', new Map()));
});

it('los autores con su nombre, inicial y color', () => {
  const autores = autoresDelClub([miembro('u-ana', 'Ana Torres'), miembro('u-x', null)], new Map([['u-ana', '#E24947']]), 'alguien');
  expect(autores.get('u-ana')).toEqual({ id: 'u-ana', nombre: 'Ana Torres', color: '#E24947', inicial: 'A' });
  expect(autores.get('u-x')?.nombre).toBe('x');
});

it('quién la hizo y quién la cambió; lo recién creado (sin dueño aún) es mío', () => {
  const autores = autoresDelClub([miembro('u-ana', 'Ana'), miembro('u-luis', 'Luis')], new Map(), 'alguien');
  expect(autoria({ club_id: 'c1', owner_id: 'u-ana', updated_by: null }, 'yo', autores, T)).toBe('De Ana');
  expect(autoria({ club_id: 'c1', owner_id: 'u-ana', updated_by: 'u-luis' }, 'yo', autores, T)).toBe('De Ana · la cambió Luis');
  expect(autoria({ club_id: 'c1', owner_id: 'yo', updated_by: 'u-ana' }, 'yo', autores, T)).toBe('Tuya · la cambió Ana');
  expect(autoria({ club_id: 'c1', owner_id: 'yo', updated_by: 'yo' }, 'yo', autores, T)).toBeNull();
  expect(autoria({ club_id: null, owner_id: 'u-ana', updated_by: null }, 'yo', autores, T)).toBeNull();
  expect(esDeOtroEnElClub({ club_id: 'c1', owner_id: '' }, 'yo')).toBe(false);
});

it('ocultar la capa del club deja solo lo mío', () => {
  const lista = [{ id: 'a', club_id: 'c1', owner_id: 'yo' }, { id: 'b', club_id: 'c1', owner_id: 'u-ana' }, { id: 'c', club_id: null, owner_id: 'yo' }];
  expect(conCapaDelClub(lista, 'yo', false).map((a) => a.id)).toEqual(['a', 'c']);
  expect(conCapaDelClub(lista, 'yo', true)).toBe(lista);
});
