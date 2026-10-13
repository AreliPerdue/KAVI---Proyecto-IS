/** Lo que calcula la librería de KAVI Library para pintarse (spec 13a, T277). */
import { PEOPLE_COLORS } from '@/constants/people-colors';
import { INK, PAPER } from '@/constants/theme';
import { avanceDe, colorDePortada, columnasPara, libraryViewValida, primerNombre, rutaDePortada, textoSobre } from '@/lib/library/shelf';

describe('columnasPara (RF-BL1)', () => {
  it.each([
    [360, 2],
    [599, 2],
    [600, 4],
    [768, 5],
    [1100, 6],
    [1600, 6],
  ])('%d px → %d columnas', (ancho, columnas) => {
    expect(columnasPara(ancho)).toBe(columnas);
  });
});

describe('colorDePortada', () => {
  it('usa el color dominante cuando lo hay (RF-BL13)', () => {
    expect(colorDePortada({ id: 'a', cover_color: '#123456' })).toBe('#123456');
  });

  it('sin portada, da un color de los Nobi que no cambia entre aperturas (RF-BL12)', () => {
    const color = colorDePortada({ id: 'pieza-1', cover_color: null });
    expect(PEOPLE_COLORS.map((c) => c.hex)).toContain(color);
    expect(colorDePortada({ id: 'pieza-1', cover_color: null })).toBe(color);
  });

  it('reparte colores distintos entre piezas', () => {
    const colores = new Set(Array.from({ length: 30 }, (_, i) => colorDePortada({ id: `pieza-${i}`, cover_color: null })));
    expect(colores.size).toBeGreaterThan(5);
  });
});

describe('textoSobre', () => {
  it('papel sobre colores oscuros y tinta sobre claros', () => {
    expect(textoSobre('#1E2761')).toBe(PAPER);
    expect(textoSobre('#F1D35D')).toBe(INK);
  });
});

describe('avanceDe (RF-BL3)', () => {
  const base = { page_count: null, progress: 0, last_position: null };

  it('sin abrir no hay avance', () => {
    expect(avanceDe(base)).toBeNull();
  });

  it('un PDF dice su página y el total', () => {
    expect(avanceDe({ ...base, page_count: 340, progress: 0.35, last_position: { page: 120 } })).toEqual({ tipo: 'pagina', pagina: 120, total: 340 });
  });

  it('nunca pasa del total', () => {
    expect(avanceDe({ ...base, page_count: 10, progress: 0.9, last_position: { page: 12 } })).toEqual({ tipo: 'pagina', pagina: 10, total: 10 });
  });

  it('al 100 % está terminado, en PDF y en EPUB', () => {
    expect(avanceDe({ ...base, page_count: 124, progress: 1, last_position: { page: 124 } })).toEqual({ tipo: 'terminado' });
    expect(avanceDe({ ...base, progress: 1, last_position: { cfi: 'x' } })).toEqual({ tipo: 'terminado' });
  });

  it('un EPUB dice el porcentaje, y un poco leído no se ve como 0 %', () => {
    expect(avanceDe({ ...base, progress: 0.4567, last_position: { cfi: 'epubcfi(/6/4)' } })).toEqual({ tipo: 'porcentaje', porcentaje: 46 });
    expect(avanceDe({ ...base, progress: 0.001 })).toEqual({ tipo: 'porcentaje', porcentaje: 1 });
  });
});

it('libraryViewValida descarta lo que no es una vista', () => {
  expect(libraryViewValida('list')).toBe('list');
  expect(libraryViewValida('shelf')).toBe('covers');
  expect(libraryViewValida(undefined)).toBe('covers');
});

describe('portada propia (RF-BL23)', () => {
  it('se ve la propia mientras exista, con su color; si no, la del archivo', () => {
    const base = { id: 'a', cover_path: 'u/a/cover.jpg', cover_color: '#123456' };
    expect(rutaDePortada(base)).toBe('u/a/cover.jpg');
    const conPropia = { ...base, custom_cover_path: 'u/a/cover-custom.jpg', custom_cover_color: '#EC4899' };
    expect(rutaDePortada(conPropia)).toBe('u/a/cover-custom.jpg');
    expect(colorDePortada(conPropia)).toBe('#EC4899');
    expect(colorDePortada({ ...base, custom_cover_path: null, custom_cover_color: null })).toBe('#123456');
  });
});

it('primer nombre para el saludo (RF-BL22): el primero del nombre visible, o nada', () => {
  expect(primerNombre('Areli Perdue')).toBe('Areli');
  expect(primerNombre('  María José  ')).toBe('María');
  expect(primerNombre('')).toBeNull();
  expect(primerNombre(null)).toBeNull();
});
