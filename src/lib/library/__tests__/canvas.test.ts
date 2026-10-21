/** El lienzo creativo (spec 13h, RF-CC4 – RF-CC10; T351): el documento y lo que se le hace. */
import {
  aMotor,
  agregar,
  agrupar,
  bloquear,
  cambiar,
  capa,
  conSuGrupo,
  desagrupar,
  documentoValido,
  DOCUMENTO_VACIO,
  duplicar,
  type ElementoDeLienzo,
  mover,
  quitar,
} from '@/lib/library/canvas';

const el = (id: string, extra: Partial<ElementoDeLienzo> = {}): Omit<ElementoDeLienzo, 'z'> => ({
  id,
  type: 'shape',
  page: 1,
  x: 0.1,
  y: 0.1,
  w: 0.3,
  ar: 1,
  rot: 0,
  locked: false,
  group: null,
  style: {},
  content: { shape: 'rect' },
  ...extra,
});
const conTres = () => [el('a'), el('b'), el('c')].reduce(agregar, DOCUMENTO_VACIO);
const ids = (d: { elements: { id: string }[] }) => d.elements.map((e) => e.id);

describe('el documento', () => {
  it('uno roto o vacío es una página en blanco', () => {
    expect(documentoValido(null)).toEqual({ pages: 1, elements: [] });
    expect(documentoValido({ pages: 'x', elements: 'y' })).toEqual({ pages: 1, elements: [] });
  });

  it('se queda con lo que entiende, en sus límites, sin repetir y en orden de capa', () => {
    const d = documentoValido({
      pages: 2,
      elements: [
        { id: 'b', type: 'textbox', page: 9, x: 5, w: 0, z: 2, content: { text: 'hola', shape: 'heart' }, style: { color: 'rojo', size: 9 } },
        { id: 'a', type: 'shape', z: 1, content: { shape: 'nube' }, rot: -90 },
        { id: 'a', type: 'shape', z: 3 },
        { id: 'x', type: 'video' },
        'basura',
      ],
    });
    expect(ids(d)).toEqual(['a', 'b']);
    const [a, b] = d.elements;
    expect(a.content).toEqual({ shape: 'rect' });
    expect(a.rot).toBe(270);
    expect(b).toMatchObject({ page: 2, x: 1.5, w: 0.02, style: { size: 3 }, content: { text: 'hola' } });
    expect(b.style.color).toBeUndefined();
  });
});

describe('al motor', () => {
  it('cada elemento es algo pegado en su página, con su forma, color, giro y grupo', () => {
    let d = agregar(DOCUMENTO_VACIO, el('f', { style: { color: '#7A1E3A' }, content: { shape: 'heart' }, rot: 15, group: 'g' }));
    d = agregar(d, el('t', { type: 'textbox', content: { text: 'Hola' }, style: { size: 2 } }));
    d = agregar(d, el('i', { type: 'image', content: { path: 'u/l/anotaciones/i.jpg' } }));
    d = agregar(d, el('s', { type: 'sticker', content: { sticker: 'mios/s1', label: 'Nobi' } }));
    const [f, t, i, s] = aMotor(d, { imagenes: new Map([['u/l/anotaciones/i.jpg', 'https://r2/i']]), stickers: new Map([['mios/s1', 'https://r2/s']]) });
    expect(f).toEqual({ id: 'f', kind: 'shape', locator: { page: 1, x: 0.1, y: 0.1, w: 0.3, ar: 1 }, z: 1, locked: false, content: { shape: 'heart', color: '#7A1E3A', rot: 15, group: 'g' } });
    expect(t.content).toEqual({ text: 'Hola', size: 2 });
    expect(i.content).toEqual({ src: 'https://r2/i' });
    expect(s.content).toEqual({ sticker: 'mios/s1', label: 'Nobi', src: 'https://r2/s' });
  });
});

describe('lo que se le hace', () => {
  it('agregar va hasta arriba; mover cambia lugar, tamaño y giro', () => {
    let d = conTres();
    expect(d.elements.map((e) => e.z)).toEqual([1, 2, 3]);
    d = mover(d, 'a', { page: 1, x: 0.5, y: 0.6, w: 0.2, ar: 2 }, 30);
    expect(d.elements.find((e) => e.id === 'a')).toMatchObject({ x: 0.5, y: 0.6, w: 0.2, ar: 2, rot: 30 });
  });

  it('lo bloqueado no se mueve, pero sí se desbloquea', () => {
    let d = bloquear(conTres(), ['a'], true);
    d = mover(d, 'a', { page: 1, x: 0.9, y: 0.9 });
    expect(d.elements.find((e) => e.id === 'a')).toMatchObject({ x: 0.1, y: 0.1, locked: true });
    d = cambiar(d, 'a', { locked: false });
    expect(d.elements.find((e) => e.id === 'a')?.locked).toBe(false);
  });

  it('traer al frente y mandar atrás conservan el orden de lo que se mueve', () => {
    expect(ids(capa(conTres(), ['a'], 'front'))).toEqual(['b', 'c', 'a']);
    expect(ids(capa(conTres(), ['c', 'b'], 'back'))).toEqual(['b', 'c', 'a']);
  });

  it('agrupar junta; el grupo se borra, se bloquea y se mueve de capa entero; desagrupar lo suelta', () => {
    let d = agrupar(conTres(), ['a', 'c'], 'g1');
    expect(conSuGrupo(d, ['a'])).toEqual(['a', 'c']);
    expect(agrupar(d, ['b'], 'g2')).toBe(d);
    expect(ids(capa(d, ['a'], 'front'))).toEqual(['b', 'a', 'c']);
    expect(bloquear(d, ['c'], true).elements.filter((e) => e.locked).map((e) => e.id)).toEqual(['a', 'c']);
    expect(ids(quitar(d, ['a']))).toEqual(['b']);
    d = desagrupar(d, ['a']);
    expect(conSuGrupo(d, ['a'])).toEqual(['a']);
  });

  it('duplicar copia corrido, arriba y sin candado; un grupo duplicado es otro grupo', () => {
    let n = 0;
    const nuevoId = () => `n${++n}`;
    const d = bloquear(agrupar(conTres(), ['a', 'b'], 'g1'), ['c'], true);
    const copia = duplicar(d, ['a'], nuevoId);
    const nuevos = copia.doc.elements.filter((e) => copia.ids.includes(e.id));
    expect(nuevos).toHaveLength(2);
    expect(nuevos.every((e) => e.group && e.group !== 'g1' && e.group === nuevos[0].group)).toBe(true);
    expect(nuevos[0]).toMatchObject({ x: 0.13, y: 0.13, locked: false });
    expect(Math.min(...nuevos.map((e) => e.z))).toBeGreaterThan(3);
    expect(duplicar(d, ['c'], nuevoId).doc.elements.at(-1)?.locked).toBe(false);
  });
});
