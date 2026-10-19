/** Fragmentos (spec 13c, RF-BH19 – RF-BH21; T317): su lugar, cómo abrirlos y los filtros. */
import {
  dondeDeFragmento,
  filtrarFragmentos,
  librosConFragmentos,
  lugarDeImagen,
  lugarDeSeleccion,
  posicionDeFragmento,
  posicionDeRuta,
} from '@/lib/library/clips';
import type { LibraryClip } from '@/types/domain';

const fragmento = (x: Partial<LibraryClip>): LibraryClip => ({
  id: 'f',
  owner_id: 'u1',
  item_id: 'l1',
  book_title: 'Rayuela',
  kind: 'text',
  text: 'x',
  locator: {},
  path: null,
  ar: null,
  note: null,
  created_at: '2026-10-19T10:00:00Z',
  updated_at: '2026-10-19T10:00:00Z',
  ...x,
});

it('de una selección guarda la página (de sus renglones si hace falta) o el CFI, sin los renglones', () => {
  expect(lugarDeSeleccion({ rects: [{ page: 3, x: 0, y: 0, w: 1, h: 0.1 }] }, 0.2)).toEqual({ page: 3, fraction: 0.2 });
  expect(lugarDeSeleccion({ cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:9)', fraction: 0.123456 })).toEqual({ cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:9)', fraction: 0.1235 });
});

it('uno de imagen guarda su página y su rectángulo en PDF; en EPUB, donde se leía', () => {
  expect(lugarDeImagen({ page: 2, rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } }, { page: 9, fraction: 0.5 })).toEqual({ page: 2, x: 0.1, y: 0.2, w: 0.3, h: 0.4, fraction: 0.5 });
  expect(lugarDeImagen({}, { cfi: 'epubcfi(/6/8)', fraction: 0.4 })).toEqual({ cfi: 'epubcfi(/6/8)', fraction: 0.4 });
});

it('abrir en su lugar: el CFI manda, luego la página y si no, la parte del libro', () => {
  expect(posicionDeFragmento({ cfi: 'epubcfi(/6/8)', page: 3 })).toEqual({ cfi: 'epubcfi(/6/8)' });
  expect(posicionDeFragmento({ page: 3, x: 0.1 })).toEqual({ page: 3 });
  expect(posicionDeFragmento({ fraction: 0.4 })).toEqual({ fraction: 0.4 });
  expect(posicionDeFragmento({})).toBeUndefined();
});

it('la posición de la ruta se revisa: lo que no tiene forma se ignora', () => {
  expect(posicionDeRuta(JSON.stringify({ page: 7 }))).toEqual({ page: 7 });
  expect(posicionDeRuta(JSON.stringify({ cfi: 'epubcfi(/6/8)' }))).toEqual({ cfi: 'epubcfi(/6/8)' });
  expect(posicionDeRuta(JSON.stringify({ fraction: 0.5 }))).toEqual({ fraction: 0.5 });
  for (const malo of [undefined, '{nada', '[]', JSON.stringify({ page: 0 }), JSON.stringify({ cfi: 'javascript:' }), JSON.stringify({ fraction: 3 }), ['a']]) {
    expect(posicionDeRuta(malo as never)).toBeUndefined();
  }
});

it('dice dónde estaba: la página o el porcentaje', () => {
  const t = { page: (n: number) => `p. ${n}`, percent: (n: number) => `${n} %` };
  expect(dondeDeFragmento({ page: 12 }, t)).toBe('p. 12');
  expect(dondeDeFragmento({ fraction: 0.345 }, t)).toBe('35 %');
  expect(dondeDeFragmento({}, t)).toBeNull();
});

it('filtra por tipo y por libro; uno de un libro borrado se agrupa por su título', () => {
  const lista = [
    fragmento({ id: 'a', kind: 'text' }),
    fragmento({ id: 'b', kind: 'image', text: null }),
    fragmento({ id: 'c', item_id: null, book_title: 'Ficciones' }),
  ];
  expect(filtrarFragmentos(lista, { kind: 'image', libro: null }).map((c) => c.id)).toEqual(['b']);
  expect(filtrarFragmentos(lista, { kind: 'all', libro: 'titulo:Ficciones' }).map((c) => c.id)).toEqual(['c']);
  expect(filtrarFragmentos(lista, { kind: 'text', libro: 'l1' }).map((c) => c.id)).toEqual(['a']);
  expect(librosConFragmentos(lista)).toEqual([
    { clave: 'titulo:Ficciones', titulo: 'Ficciones' },
    { clave: 'l1', titulo: 'Rayuela' },
  ]);
});
