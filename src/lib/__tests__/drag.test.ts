/**
 * A dónde cae lo que se arrastra (spec 10, T225 – T228; spec 07 v2, RF-F33).
 */
import { destinoEnFilas, destinoEnRejilla, destinoPorCentros, type EntradaDeLista, ubicarSoltado } from '@/lib/drag';

describe('destinoEnFilas (T225)', () => {
  // Filas de alto distinto: una con nota mide el doble que una con solo título.
  const alturas = [40, 80, 40, 40];

  it('menos de media fila no cambia nada', () => {
    expect(destinoEnFilas(alturas, 0, 39, 4)).toBe(0);
  });

  it('pasar la mitad de la siguiente salta a su lugar, con su alto real', () => {
    expect(destinoEnFilas(alturas, 0, 40, 4)).toBe(1);
    expect(destinoEnFilas(alturas, 0, 80 + 20, 4)).toBe(2);
  });

  it('hacia arriba igual, y nunca sale de la lista', () => {
    expect(destinoEnFilas(alturas, 3, -60, 4)).toBe(2);
    expect(destinoEnFilas(alturas, 1, -1000, 4)).toBe(0);
    expect(destinoEnFilas(alturas, 1, 1000, 4)).toBe(3);
  });
});

describe('destinoEnRejilla (T226, T227)', () => {
  const base = { columnas: 2, total: 5, anchoCelda: 150, separacion: 8, alturasFila: [100, 140, 100] };

  it('se mueve de columna con el desplazamiento horizontal', () => {
    expect(destinoEnRejilla({ ...base, desde: 0, dx: 160, dy: 0 })).toBe(1);
  });

  it('las filas usan su alto real', () => {
    expect(destinoEnRejilla({ ...base, desde: 0, dx: 0, dy: 75 })).toBe(2);
    expect(destinoEnRejilla({ ...base, desde: 0, dx: 0, dy: 70 })).toBe(0);
  });

  it('soltar en el hueco vacío de la última fila es soltar al final', () => {
    expect(destinoEnRejilla({ ...base, desde: 0, dx: 160, dy: 1000 })).toBe(4);
  });

  it('sin medir todavía no se mueve', () => {
    expect(destinoEnRejilla({ ...base, anchoCelda: 0, desde: 1, dx: 500, dy: 500 })).toBe(1);
  });
});

describe('destinoPorCentros (RF-F33)', () => {
  const medidas = [
    { y: 0, h: 50 },
    { y: 54, h: 90 },
    { y: 148, h: 50 },
  ];

  it('el destino es cuántas filas quedan con el centro arriba del centro de la arrastrada', () => {
    expect(destinoPorCentros(medidas, 0, 0)).toBe(0);
    expect(destinoPorCentros(medidas, 0, 80)).toBe(1);
    expect(destinoPorCentros(medidas, 0, 160)).toBe(2);
    expect(destinoPorCentros(medidas, 2, -150)).toBe(0);
  });
});

describe('ubicarSoltado (T228)', () => {
  const item = (id: string, section_id: string | null, sort_order: number): EntradaDeLista => ({ kind: 'item', item: { id, section_id, sort_order } });
  // [sueltos] a, b, captura · [Frutas] encabezado, c, d, captura
  const entradas: EntradaDeLista[] = [
    item('a', null, 1024),
    item('b', null, 2048),
    { kind: 'composer', sectionId: null },
    { kind: 'header', sectionId: 'frutas' },
    item('c', 'frutas', 1024),
    item('d', 'frutas', 2048),
    { kind: 'composer', sectionId: 'frutas' },
  ];

  it('la sección es la del encabezado que queda por encima', () => {
    expect(ubicarSoltado(entradas, 0, 4)).toEqual({ sectionId: 'frutas', sortOrder: 1536 });
  });

  it('el orden se calcula entre vecinos de la sección de destino, no de la de origen', () => {
    expect(ubicarSoltado(entradas, 4, 0)).toEqual({ sectionId: null, sortOrder: 512 });
  });

  it('soltar justo debajo del campo de captura cae en la sección de ese campo', () => {
    // Quitando "a", el índice 2 queda justo debajo de la captura sin agrupar.
    expect(ubicarSoltado(entradas, 0, 2)?.sectionId).toBeNull();
  });

  it('al final de una sección: después del último', () => {
    expect(ubicarSoltado(entradas, 0, 5)).toEqual({ sectionId: 'frutas', sortOrder: 3072 });
  });

  it('encabezados y campos de captura no se pueden arrastrar', () => {
    expect(ubicarSoltado(entradas, 3, 0)).toBeNull();
    expect(ubicarSoltado(entradas, 2, 0)).toBeNull();
  });
});

describe('guarda de arrastre (T226)', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- módulo con estado propio */
  const { arrastreReciente, marcarArrastre } = require('@/components/lists/drag-guard') as typeof import('@/components/lists/drag-guard');

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('soltar tras arrastrar no dispara el toque', () => {
    marcarArrastre();
    expect(arrastreReciente()).toBe(true);
  });

  it('un toque normal (sin arrastre reciente) sí pasa', () => {
    marcarArrastre();
    jest.advanceTimersByTime(300);
    expect(arrastreReciente()).toBe(false);
  });
});
