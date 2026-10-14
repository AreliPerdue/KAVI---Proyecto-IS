/** La capa de anotaciones (spec 13c, RF-BH16 – RF-BH17; T286): capas, panel y posiciones que llegan del motor. */
import {
  aEntrada,
  coloresRapidos,
  COLORES_RAPIDOS,
  estiloDe,
  localizadorDeTexto,
  notaDe,
  palabraParaDefinir,
  destinoDe,
  filtrarAnotaciones,
  localizadorPegado,
  opcionesDeFiltro,
  ordenarAnotaciones,
  zAlFondo,
  zAlFrente,
  zNueva,
} from '@/lib/library/annotations';
import type { LibraryAnnotation } from '@/types/domain';

const nota = (id: string, cambio: Partial<LibraryAnnotation> = {}): LibraryAnnotation => ({
  id,
  item_id: 'l1',
  owner_id: 'u1',
  kind: 'postit',
  locator: { page: 1, x: 0.1, y: 0.1, w: 0.24 },
  content: { color: '#F1D35D', text: id },
  z: 1,
  removed: false,
  locked: false,
  created_at: '2026-10-13T10:00:00.000Z',
  updated_at: '2026-10-13T10:00:00.000Z',
  ...cambio,
});

describe('capas (RF-BH16)', () => {
  const capas = [nota('a', { z: 1 }), nota('b', { z: 2 }), nota('c', { z: 5 })];

  it('lo nuevo va encima de todo', () => {
    expect(zNueva(capas)).toBe(6);
    expect(zNueva([])).toBe(1);
  });

  it('traer al frente y mandar atrás; si ya está ahí, no cambia nada', () => {
    expect(zAlFrente(capas, 'a')).toBe(6);
    expect(zAlFrente(capas, 'c')).toBeNull();
    expect(zAlFondo(capas, 'c')).toBe(0);
    expect(zAlFondo(capas, 'a')).toBeNull();
    expect(zAlFrente(capas, 'no-existe')).toBeNull();
  });

  it('solo, no hay a quién rebasar', () => {
    expect(zAlFrente([nota('a')], 'a')).toBeNull();
    expect(zAlFondo([nota('a')], 'a')).toBeNull();
  });
});

describe('panel (RF-BH17)', () => {
  const lista = [
    nota('p9', { locator: { page: 9, x: 0, y: 0.5, w: 0.2 } }),
    nota('p2abajo', { locator: { page: 2, x: 0, y: 0.8, w: 0.2 }, content: { color: '#E24947' } }),
    nota('p2arriba', { locator: { page: 2, x: 0, y: 0.1, w: 0.2 } }),
    nota('quitado', { kind: 'sticker', removed: true, content: { color: '#4087EE' } }),
    nota('subrayado', { kind: 'highlight', locator: { page: 5, x: 0, y: 0, w: 0.1 }, content: { color: '#e24947' } }),
  ];

  it('en el orden del libro: página y altura', () => {
    expect(ordenarAnotaciones(lista.filter((a) => !a.removed)).map((a) => a.id)).toEqual(['p2arriba', 'p2abajo', 'subrayado', 'p9']);
  });

  it('en EPUB, por cuánto del libro llevaba', () => {
    const epub = [nota('tarde', { locator: { cfi: 'epubcfi(/6/8)', x: 0, w: 0.2, fraction: 0.8 } }), nota('pronto', { locator: { cfi: 'epubcfi(/6/2)', x: 0, w: 0.2, fraction: 0.1 } })];
    expect(ordenarAnotaciones(epub).map((a) => a.id)).toEqual(['pronto', 'tarde']);
  });

  it('en EPUB con el mismo avance, por dónde cae en el texto', () => {
    const epub = [
      nota('abajo', { locator: { cfi: 'epubcfi(/6/4!/4/10/1:5)', x: 0, w: 0.2, fraction: 0 } }),
      nota('arriba', { locator: { cfi: 'epubcfi(/6/4!/4/2/1:30)', x: 0, w: 0.2, fraction: 0 } }),
      nota('otro-capitulo', { locator: { cfi: 'epubcfi(/6/2!/4/40)', x: 0, w: 0.2, fraction: 0 } }),
    ];
    expect(ordenarAnotaciones(epub).map((a) => a.id)).toEqual(['otro-capitulo', 'arriba', 'abajo']);
  });

  it('filtra por tipo y por color; lo quitado (charola de stickers) no sale', () => {
    expect(filtrarAnotaciones(lista, { tipo: null, color: null })).toHaveLength(4);
    expect(filtrarAnotaciones(lista, { tipo: 'highlight', color: null }).map((a) => a.id)).toEqual(['subrayado']);
    expect(filtrarAnotaciones(lista, { tipo: null, color: '#E24947' }).map((a) => a.id)).toEqual(['p2abajo', 'subrayado']);
    expect(filtrarAnotaciones(lista, { tipo: 'postit', color: '#E24947' }).map((a) => a.id)).toEqual(['p2abajo']);
  });

  it('solo ofrece filtros que encuentran algo, los colores en el orden de la paleta', () => {
    expect(opcionesDeFiltro(lista)).toEqual({ tipos: ['postit', 'highlight'], colores: ['#E24947', '#F1D35D'] });
  });

  it('a dónde ir desde el panel', () => {
    expect(destinoDe({ page: 4, x: 0, y: 0 })).toEqual({ page: 4 });
    expect(destinoDe({ cfi: 'epubcfi(/6/4)', fraction: 0.3 })).toEqual({ cfi: 'epubcfi(/6/4)' });
    expect(destinoDe({})).toBeNull();
  });
});

describe('posición que llega del motor (spec 13 §5)', () => {
  it('PDF: página y esquina en 0–1 con su ancho', () => {
    expect(localizadorPegado({ page: 3, x: 0.2, y: 0.4, w: 0.24, extra: 'no' })).toEqual({ page: 3, x: 0.2, y: 0.4, w: 0.24 });
  });

  it('EPUB: CFI con su x, ancho y avance', () => {
    expect(localizadorPegado({ cfi: 'epubcfi(/6/4!/4/2:10)', x: 0.5, w: 0.24, fraction: 0.31 })).toEqual({ cfi: 'epubcfi(/6/4!/4/2:10)', x: 0.5, w: 0.24, fraction: 0.31 });
  });

  it('rechaza lo que no tiene esa forma', () => {
    expect(localizadorPegado(null)).toBeNull();
    expect(localizadorPegado({ page: 0, x: 0.2, y: 0.4, w: 0.24 })).toBeNull();
    expect(localizadorPegado({ page: 1, x: 1.4, y: 0.4, w: 0.24 })).toBeNull();
    expect(localizadorPegado({ page: 1, x: 0.2, w: 0.24 })).toBeNull();
    expect(localizadorPegado({ page: 1, x: 0.2, y: 0.2, w: 0 })).toBeNull();
    expect(localizadorPegado({ cfi: 'javascript:1', x: 0.2, w: 0.24 })).toBeNull();
  });
});

it('a la cola va la fila completa, sin dueño ni fechas (los pone la base)', () => {
  expect(aEntrada(nota('a'))).toEqual({
    id: 'a',
    item_id: 'l1',
    kind: 'postit',
    locator: { page: 1, x: 0.1, y: 0.1, w: 0.24 },
    content: { color: '#F1D35D', text: 'a' },
    z: 1,
    removed: false,
    locked: false,
  });
});

describe('subrayados (RF-BH7 – RF-BH8, T287)', () => {
  it('el último color usado va primero, sin repetirse y sin crecer', () => {
    expect(coloresRapidos(null)).toEqual(COLORES_RAPIDOS);
    expect(coloresRapidos('#e24947')).toEqual(['#E24947', ...COLORES_RAPIDOS.slice(0, 3)]);
    const amarillo = COLORES_RAPIDOS[0];
    expect(coloresRapidos(amarillo)).toEqual(COLORES_RAPIDOS);
  });

  it('estilo y nota con valores por omisión', () => {
    expect(estiloDe(nota('a', { content: {} }))).toBe('highlight');
    expect(estiloDe(nota('a', { content: { style: 'strike' } }))).toBe('strike');
    expect(estiloDe(nota('a', { content: { style: 'raro' } }))).toBe('highlight');
    expect(notaDe(nota('a', { content: { note: 'hola' } }))).toBe('hola');
    expect(notaDe(nota('a', { content: {} }))).toBe('');
  });

  it('se define una sola palabra, sin la puntuación que la rodea', () => {
    expect(palabraParaDefinir('«ciudad»,')).toBe('ciudad');
    expect(palabraParaDefinir(' serendipity ')).toBe('serendipity');
    expect(palabraParaDefinir("don't")).toBe("don't");
    expect(palabraParaDefinir('la ciudad')).toBeNull();
    expect(palabraParaDefinir('1984')).toBeNull();
    expect(palabraParaDefinir('a'.repeat(41))).toBeNull();
  });

  it('el texto seleccionado en PDF: sus renglones, la página y la altura donde empieza', () => {
    expect(
      localizadorDeTexto({ rects: [{ page: 4, x: 0.1, y: 0.05, w: 0.3, h: 0.02 }, { page: 3, x: 0.1, y: 0.9, w: 0.5, h: 0.02 }, { page: 3, x: 0.1, y: 0.95, w: 0.2, h: 0.02 }] }),
    ).toEqual({
      page: 3,
      y: 0.9,
      rects: [
        { page: 4, x: 0.1, y: 0.05, w: 0.3, h: 0.02 },
        { page: 3, x: 0.1, y: 0.9, w: 0.5, h: 0.02 },
        { page: 3, x: 0.1, y: 0.95, w: 0.2, h: 0.02 },
      ],
    });
  });

  it('en EPUB, el CFI del rango y el avance', () => {
    expect(localizadorDeTexto({ cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:9)', fraction: 0.4 })).toEqual({ cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:9)', fraction: 0.4 });
  });

  it('rechaza lo que no tiene esa forma', () => {
    expect(localizadorDeTexto(null)).toBeNull();
    expect(localizadorDeTexto({ rects: [] })).toBeNull();
    expect(localizadorDeTexto({ rects: [{ page: 1, x: 2, y: 0, w: 0.1, h: 0.1 }] })).toBeNull();
    expect(localizadorDeTexto({ rects: Array(401).fill({ page: 1, x: 0, y: 0, w: 0.1, h: 0.1 }) })).toBeNull();
    expect(localizadorDeTexto({ cfi: 'otra-cosa' })).toBeNull();
  });
});
