/** El librero (RF-BL2, T282): cuánto mide cada lomo y cómo se reparten en repisas. */
import { altoConImagen, anchoDeSaga, ANCHO_RESTO, altoDeLomo, grosorDeLomo, LOMO_ALTO_IMAGEN_MAX, LOMO_ALTO_MAX, LOMO_ALTO_MIN, LOMO_MAX, LOMO_MIN, LOMO_SIN_PAGINAS, repartirEnRepisas } from '@/lib/library/spines';

describe('grosor', () => {
  it('más páginas, más grueso, entre el mínimo y el máximo', () => {
    expect(grosorDeLomo(100)).toBe(36);
    expect(grosorDeLomo(300)).toBe(48);
    expect(grosorDeLomo(10)).toBe(LOMO_MIN);
    expect(grosorDeLomo(5000)).toBe(LOMO_MAX);
  });

  it('sin páginas conocidas (EPUB), uno medio', () => {
    for (const p of [null, undefined, 0]) expect(grosorDeLomo(p)).toBe(LOMO_SIN_PAGINAS);
  });
});

it('el alto varía entre libros pero cada uno mide siempre lo mismo', () => {
  const altos = ['a', 'b', 'c', 'd', 'e', 'f'].map(altoDeLomo);
  for (const a of altos) {
    expect(a).toBeGreaterThanOrEqual(LOMO_ALTO_MIN);
    expect(a).toBeLessThanOrEqual(LOMO_ALTO_MAX);
  }
  expect(new Set(altos).size).toBeGreaterThan(1);
  expect(altoDeLomo('a')).toBe(altos[0]);
});

describe('repisas', () => {
  const id = (n: number) => n;
  it('llena cada repisa en orden y pasa a la siguiente cuando ya no cabe', () => {
    expect(repartirEnRepisas([40, 40, 40, 40], id, 130, 3)).toEqual([[40, 40, 40], [40]]);
    expect(repartirEnRepisas([40, 40], id, 83, 3)).toEqual([[40, 40]]);
    expect(repartirEnRepisas([40, 40], id, 82, 3)).toEqual([[40], [40]]);
  });

  it('lo más ancho que la repisa va solo, nunca se pierde', () => {
    expect(repartirEnRepisas([30, 200, 30], id, 100)).toEqual([[30], [200], [30]]);
    expect(repartirEnRepisas([], id, 100)).toEqual([]);
  });
});

it('una saga ocupa sus primeros cinco lomos y el "+n" si son más', () => {
  expect(anchoDeSaga([100, 300])).toBe(36 + 48);
  expect(anchoDeSaga([null, null, null, null, null, null, null])).toBe(5 * LOMO_SIN_PAGINAS + ANCHO_RESTO);
});

describe('lomo con imagen', () => {
  it('toma el alto que pide la imagen a su grosor, para verse completa', () => {
    expect(altoConImagen(50, 100, 400)).toEqual({ alto: 200, ajustada: true });
  });

  it('entre el mínimo y el tope; ahí la imagen se ve entera dentro', () => {
    expect(altoConImagen(50, 100, 1000)).toEqual({ alto: LOMO_ALTO_IMAGEN_MAX, ajustada: false });
    expect(altoConImagen(50, 100, 100)).toEqual({ alto: LOMO_ALTO_MIN, ajustada: false });
    expect(altoConImagen(50, 0, 100)).toEqual({ alto: LOMO_ALTO_MIN, ajustada: false });
  });
});
