/** El librero (RF-BL2, T282): cuánto mide cada lomo y cómo se reparten en repisas. */
import {
  altoDeLomo,
  altoDeLomosValido,
  anchoDeLomo,
  anchoDeSaga,
  ANCHO_RESTO,
  destinoEnRepisas,
  grosorDeLomo,
  LOMO_ALTO_IGUAL,
  LOMO_ALTO_MAX,
  LOMO_ALTO_MIN,
  LOMO_MAX,
  LOMO_MAX_IMAGEN,
  LOMO_MIN,
  LOMO_SIN_PAGINAS,
  medidaDeLomo,
  repartirEnRepisas,
} from '@/lib/library/spines';

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

describe('alto (RF-BL2b)', () => {
  it('variado: cambia entre libros pero cada uno mide siempre lo mismo', () => {
    const altos = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => altoDeLomo({ id }, 'varied'));
    for (const a of altos) {
      expect(a).toBeGreaterThanOrEqual(LOMO_ALTO_MIN);
      expect(a).toBeLessThanOrEqual(LOMO_ALTO_MAX);
    }
    expect(new Set(altos).size).toBeGreaterThan(1);
    expect(altoDeLomo({ id: 'a' }, 'varied')).toBe(altos[0]);
  });

  it('variado: los tomos de una saga miden lo mismo, sea cual sea su id', () => {
    const tomos = ['t1', 't2', 't3', 't4'].map((id) => altoDeLomo({ id, series_id: 'acotar' }, 'varied'));
    expect(new Set(tomos).size).toBe(1);
  });

  it('todos iguales: el mismo alto para todos, con saga o sin ella', () => {
    expect(new Set([altoDeLomo({ id: 'a' }, 'equal'), altoDeLomo({ id: 'b', series_id: 's' }, 'equal')])).toEqual(new Set([LOMO_ALTO_IGUAL]));
  });

  it('lo guardado que no es un modo vuelve al variado', () => {
    expect(altoDeLomosValido('equal')).toBe('equal');
    expect(altoDeLomosValido('raro')).toBe('varied');
  });
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
  expect(anchoDeSaga([36, 48])).toBe(36 + 48);
  expect(anchoDeSaga(Array(7).fill(LOMO_SIN_PAGINAS))).toBe(5 * LOMO_SIN_PAGINAS + ANCHO_RESTO);
});

describe('lomo con imagen (RF-BL20)', () => {
  it('toma el ancho que pide la imagen a su alto, para verse completa', () => {
    expect(anchoDeLomo(300, 196, 0.25)).toEqual({ ancho: 49, ajustada: true });
  });

  it('entre el mínimo y el tope; ahí la imagen se ve entera dentro', () => {
    expect(anchoDeLomo(300, 196, 1)).toEqual({ ancho: LOMO_MAX_IMAGEN, ajustada: false });
    expect(anchoDeLomo(300, 196, 0.05)).toEqual({ ancho: LOMO_MIN, ajustada: false });
  });

  it('sin proporción conocida (aún no carga o no hay imagen), el de sus páginas', () => {
    expect(anchoDeLomo(300, 196, null)).toEqual({ ancho: 48, ajustada: false });
    expect(anchoDeLomo(300, 196, 0)).toEqual({ ancho: 48, ajustada: false });
  });

  it('los tomos de una saga con imagen: mismo alto y cada uno el ancho de su imagen', () => {
    const proporciones = { 'u/1/lomo.jpg': 0.2, 'u/2/lomo.jpg': 0.3 };
    const uno = medidaDeLomo({ id: '1', series_id: 's', page_count: 400, spine_path: 'u/1/lomo.jpg' }, 'varied', proporciones);
    const dos = medidaDeLomo({ id: '2', series_id: 's', page_count: 900, spine_path: 'u/2/lomo.jpg' }, 'varied', proporciones);
    expect(uno.alto).toBe(dos.alto);
    expect(uno.ancho).toBe(Math.round(uno.alto * 0.2));
    expect(dos.ancho).toBe(Math.round(dos.alto * 0.3));
  });
});

describe('soltar un lomo en el librero (RF-BL7b, T331)', () => {
  // Dos repisas: la primera con A, B, C; la segunda con D.
  const repisas = [
    { y: 0, h: 220 },
    { y: 240, h: 220 },
  ];
  const lomos = [
    { fila: 0, x: 0, w: 40 },
    { fila: 0, x: 43, w: 40 },
    { fila: 0, x: 86, w: 40 },
    { fila: 1, x: 0, w: 40 },
  ];
  it('dentro de su repisa, antes del primer lomo cuyo centro queda a la derecha', () => {
    // A hasta después de B (centro en 70): sin A, B queda antes → lugar 1.
    expect(destinoEnRepisas({ desde: 0, punto: { x: 70, y: 100 }, lomos, repisas })).toBe(1);
    // C al principio.
    expect(destinoEnRepisas({ desde: 2, punto: { x: 5, y: 100 }, lomos, repisas })).toBe(0);
  });

  it('a otra repisa: cuenta los de las repisas de arriba', () => {
    expect(destinoEnRepisas({ desde: 0, punto: { x: 50, y: 300 }, lomos, repisas })).toBe(3);
    expect(destinoEnRepisas({ desde: 3, punto: { x: 50, y: 100 }, lomos, repisas })).toBe(1);
  });

  it('fuera de todas, la repisa más cercana; sin medidas, no se mueve', () => {
    expect(destinoEnRepisas({ desde: 0, punto: { x: 500, y: 900 }, lomos, repisas })).toBe(3);
    expect(destinoEnRepisas({ desde: 0, punto: { x: 0, y: 0 }, lomos: [], repisas })).toBe(0);
  });
});
