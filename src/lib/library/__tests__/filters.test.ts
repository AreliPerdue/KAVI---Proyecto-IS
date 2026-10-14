/** Buscar, filtrar y ordenar la librería (RF-BL8, RF-BL10, RF-BL18; T280). */
import {
  cuantosFiltros,
  distanciaDeColor,
  limitesDe,
  opcionesDeFiltro,
  ordenEntre,
  ordenManualDe,
  ordenValido,
  piezasVisibles,
  SIN_FILTROS,
  type Consulta,
} from '@/lib/library/filters';
import type { LibraryItem } from '@/types/domain';

const pieza = (id: string, extra: Partial<LibraryItem> = {}) =>
  ({ id, title: id, authors: [], genres: [], category: null, cover_color: null, created_at: '2026-10-01T12:00:00Z', sort_order: 0, ...extra }) as LibraryItem;

const libros = [
  pieza('a', { title: 'Rayuela', authors: ['Julio Cortázar'], genres: ['Novela'], category: 'Novela', cover_color: '#1E2761', created_at: '2026-10-10T12:00:00Z' }),
  pieza('b', { title: 'Ficciones', authors: ['Jorge Luis Borges'], genres: ['Cuentos'], cover_color: '#2A3A8C', created_at: '2026-01-05T12:00:00Z' }),
  pieza('c', { title: 'Álgebra lineal', authors: [], genres: ['Matemáticas'], category: 'Escuela', cover_color: '#F1D35D', created_at: '2026-10-12T12:00:00Z' }),
  pieza('d', { title: 'Cien años de soledad', authors: ['Gabriel García Márquez'], genres: ['novela'], category: 'Novela', cover_color: '#C0392B', created_at: '2025-06-01T12:00:00Z' }),
];

const consulta = (extra: Partial<Consulta> = {}): Consulta => ({
  busqueda: '',
  orden: 'recent',
  filtros: SIN_FILTROS,
  libreroId: null,
  enLibreros: [],
  hoy: new Date(2026, 9, 13, 10),
  ...extra,
});
const ids = (c: Partial<Consulta>) => piezasVisibles(libros, consulta(c)).map((p) => p.id);

describe('orden (RF-BL8)', () => {
  it('por omisión, lo más nuevo primero', () => expect(ids({})).toEqual(['c', 'a', 'b', 'd']));
  it('por título, sin importar acentos', () => expect(ids({ orden: 'title' })).toEqual(['c', 'd', 'b', 'a']));
  it('por autor, y los que no tienen van al final', () => expect(ids({ orden: 'author' })).toEqual(['d', 'b', 'a', 'c']));
  it('por categoría, y empates por título', () => expect(ids({ orden: 'category' })).toEqual(['c', 'd', 'a', 'b']));
  it('"como los acomodé" en Todos usa el lugar de cada pieza (RF-BL7)', () => {
    const acomodados = libros.map((l, i) => ({ ...l, sort_order: [30, 10, 40, 20][i] }));
    expect(piezasVisibles(acomodados, consulta({ orden: 'manual' })).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
  });
  it('un orden guardado que ya no existe vuelve al de omisión, que es "como los acomodé"', () => expect(ordenValido('raro')).toBe('manual'));
  it('"como los acomodé" en el librero de lomos sigue su propio orden (RF-BL7b, T331)', () => {
    const acomodados = libros.map((l, i) => ({ ...l, sort_order: [30, 10, 40, 20][i], spine_order: [2, null, 1, null][i] }));
    // Sin orden de lomo, b (10) y d (20) van por el de portadas, que es menor que 1 y 2 aquí.
    expect(piezasVisibles(acomodados, consulta({ orden: 'manual', vista: 'spines' })).map((p) => p.id)).toEqual(['c', 'a', 'b', 'd']);
    expect(piezasVisibles(acomodados, consulta({ orden: 'manual', vista: 'covers' })).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(ordenManualDe({ sort_order: 5, spine_order: null }, 'spines')).toBe(5);
    expect(ordenManualDe({ sort_order: 5, spine_order: 7 }, 'spines')).toBe(7);
    expect(ordenManualDe({ sort_order: 5, spine_order: 7 }, 'covers')).toBe(5);
  });
});

describe('libreros (RF-BL5 – RF-BL7)', () => {
  const enLibreros = [
    { shelf_id: 's1', item_id: 'd', sort_order: 2048, added_at: '' },
    { shelf_id: 's1', item_id: 'b', sort_order: 1024, added_at: '' },
    { shelf_id: 's2', item_id: 'a', sort_order: 1024, added_at: '' },
  ];
  it('solo las piezas del librero, y "como los acomodé" respeta su orden', () => {
    expect(ids({ libreroId: 's1', enLibreros, orden: 'manual' })).toEqual(['b', 'd']);
    expect(ids({ libreroId: 's1', enLibreros, orden: 'title' })).toEqual(['d', 'b']);
  });
  it('los lomos llevan su propio orden dentro del librero; sin él, el de las portadas (RF-BL7b)', () => {
    const conLomos = [
      { shelf_id: 's1', item_id: 'd', sort_order: 2048, spine_order: 1, added_at: '' },
      { shelf_id: 's1', item_id: 'b', sort_order: 1024, added_at: '' },
    ];
    expect(ids({ libreroId: 's1', enLibreros: conLomos, orden: 'manual', vista: 'spines' })).toEqual(['d', 'b']);
    expect(ids({ libreroId: 's1', enLibreros: conLomos, orden: 'manual', vista: 'covers' })).toEqual(['b', 'd']);
  });
  it('el punto medio entre vecinos al mover', () => {
    expect(ordenEntre(1024, 2048)).toBe(1536);
    expect(ordenEntre(2048, undefined)).toBe(3072);
    expect(ordenEntre(undefined, 1024)).toBe(0);
    // Con los lugares negativos de "Todos", al principio sigue quedando antes.
    expect(ordenEntre(undefined, -1_790_000_000)).toBeLessThan(-1_790_000_000);
    expect(ordenEntre(undefined, undefined)).toBe(1024);
  });
});

describe('buscar (RF-BL18)', () => {
  it('por título, autor, categoría o género, sin acentos, todas las palabras', () => {
    expect(ids({ busqueda: 'algebra' })).toEqual(['c']);
    expect(ids({ busqueda: 'borges' })).toEqual(['b']);
    expect(ids({ busqueda: 'escuela' })).toEqual(['c']);
    expect(ids({ busqueda: 'novela garcia' })).toEqual(['d']);
    expect(ids({ busqueda: 'nada que ver' })).toEqual([]);
  });
});

describe('filtros (RF-BL10)', () => {
  it('género y autor, sin importar mayúsculas', () => {
    expect(ids({ filtros: { ...SIN_FILTROS, generos: ['Novela'] } })).toEqual(['a', 'd']);
    expect(ids({ filtros: { ...SIN_FILTROS, autores: ['julio cortázar'] } })).toEqual(['a']);
  });

  it('fecha: atajos y rango propio, con días completos', () => {
    expect(ids({ filtros: { ...SIN_FILTROS, fecha: 'week' } })).toEqual(['c', 'a']);
    expect(ids({ filtros: { ...SIN_FILTROS, fecha: 'year' } })).toEqual(['c', 'a', 'b']);
    expect(ids({ filtros: { ...SIN_FILTROS, fecha: { desde: '2025-01-01', hasta: '2026-01-05' } } })).toEqual(['b', 'd']);
  });

  it('color: las portadas que se parecen, no solo la idéntica', () => {
    expect(ids({ filtros: { ...SIN_FILTROS, color: '#1E2761' } })).toEqual(['a', 'b']);
    expect(ids({ filtros: { ...SIN_FILTROS, color: '#F2D060' } })).toEqual(['c']);
  });

  it('se combinan y se cuentan', () => {
    const filtros = { ...SIN_FILTROS, generos: ['Novela'], color: '#C0392B', fecha: 'year' as const };
    expect(ids({ filtros })).toEqual([]);
    expect(cuantosFiltros(filtros)).toBe(3);
    expect(cuantosFiltros(SIN_FILTROS)).toBe(0);
  });

  it('las opciones salen de la librería, sin repetir', () => {
    expect(opcionesDeFiltro(libros)).toEqual({
      generos: ['Cuentos', 'Matemáticas', 'Novela'],
      autores: ['Gabriel García Márquez', 'Jorge Luis Borges', 'Julio Cortázar'],
    });
  });
});

it('distancia de color: idénticos 0, parecidos cerca, opuestos lejos', () => {
  expect(distanciaDeColor('#1E2761', '#1E2761')).toBe(0);
  expect(distanciaDeColor('#1E2761', '#2A3A8C')).toBeLessThan(30);
  expect(distanciaDeColor('#1E2761', '#F1D35D')).toBeGreaterThan(60);
});

it('límites de "esta semana": siete días contando hoy, hasta el final de hoy', () => {
  const [desde, hasta] = limitesDe('week', new Date(2026, 9, 13, 10));
  expect(new Date(desde)).toEqual(new Date(2026, 9, 7));
  expect(new Date(hasta)).toEqual(new Date(2026, 9, 13, 23, 59, 59, 999));
});

describe('sagas (RF-BL25)', () => {
  const conSagas = [
    pieza('z', { title: 'Zeta', series_id: null }),
    pieza('a2', { title: 'Una corte de niebla', series_id: 's1', series_index: 2 }),
    pieza('a1', { title: 'Una corte de rosas', series_id: 's1', series_index: 1 }),
    pieza('h1', { title: 'Harry', series_id: 's2', series_index: 1 }),
  ];
  const nombresDeSagas = new Map([
    ['s1', 'ACOTAR'],
    ['s2', 'Harry Potter'],
  ]);
  it('ordenar por saga: nombre, luego número; los sueltos al final', () => {
    expect(piezasVisibles(conSagas, consulta({ orden: 'series', nombresDeSagas })).map((p) => p.id)).toEqual(['a1', 'a2', 'h1', 'z']);
  });
  it('filtrar por saga', () => {
    expect(piezasVisibles(conSagas, consulta({ filtros: { ...SIN_FILTROS, sagas: ['s2'] } })).map((p) => p.id)).toEqual(['h1']);
    expect(cuantosFiltros({ ...SIN_FILTROS, sagas: ['s1', 's2'] })).toBe(2);
  });
});
