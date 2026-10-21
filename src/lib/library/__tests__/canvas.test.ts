/** El lienzo creativo (spec 13h, RF-CC4 – RF-CC10; T351): el documento y lo que se le hace. */
import {
  aMotor,
  agregar,
  archivosDeImagenes,
  agrupar,
  bloquear,
  cambiar,
  capa,
  conEstilo,
  conFondo,
  conSuGrupo,
  desagrupar,
  documentoValido,
  DOCUMENTO_VACIO,
  duplicar,
  type ElementoDeLienzo,
  mover,
  quitar,
  rutasDeImagenes,
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

describe('C2: fondo y estilo (RF-CC9, RF-CC12; T342)', () => {
  it('el fondo se guarda en mayúscula y `null` vuelve al papel', () => {
    const d = conFondo(DOCUMENTO_VACIO, '#7a1e3a');
    expect(d.background).toBe('#7A1E3A');
    expect(conFondo(d, null).background).toBeUndefined();
    expect(documentoValido({ pages: 1, background: 'rojo', elements: [] }).background).toBeUndefined();
  });

  it('opacidad, borde y sombra se ponen y se quitan, en sus límites, a todo el grupo', () => {
    let d = agrupar(conTres(), ['a', 'b'], 'g');
    d = conEstilo(d, ['a'], { opacity: 0.5, border: { width: 0.004, color: '#112233' }, shadow: true });
    const [a, b, c] = d.elements;
    expect(a.style).toEqual({ opacity: 0.5, border: { width: 0.004, color: '#112233' }, shadow: true });
    expect(b.style).toEqual(a.style);
    expect(c.style).toEqual({});
    d = conEstilo(d, ['a'], { opacity: undefined, border: undefined, shadow: undefined });
    expect(d.elements[0].style).toEqual({});
    expect(documentoValido({ elements: [{ id: 'x', type: 'shape', style: { opacity: 0, border: { width: 9, color: '#000000' } } }] }).elements[0].style).toEqual({
      opacity: 0.1,
      border: { width: 0.05, color: '#000000' },
    });
  });

  it('al motor van opacidad, borde y sombra', () => {
    const d = agregar(DOCUMENTO_VACIO, el('s', { style: { opacity: 0.75, border: { width: 0.012, color: '#000000' }, shadow: true } }));
    expect(aMotor(d)[0].content).toMatchObject({ opacity: 0.75, border: { width: 0.012, color: '#000000' }, shadow: true });
  });
});

describe('C3: módulos (RF-CC14; T343)', () => {
  it('una polaroid tiene tantos huecos como su variante, y su pie corto', () => {
    const [p] = documentoValido({ elements: [{ id: 'p', type: 'polaroid', content: { variant: 'film', paths: ['a.jpg'], text: 'x'.repeat(200) } }] }).elements;
    expect(p.content).toEqual({ variant: 'film', paths: ['a.jpg', '', ''], text: 'x'.repeat(80) });
    const [q] = documentoValido({ elements: [{ id: 'q', type: 'polaroid', content: { variant: 'gigante', paths: ['a', 'b'] } }] }).elements;
    expect(q.content).toEqual({ variant: 'classic', paths: ['a'], text: '' });
  });

  it('la calificación va de medio en medio (estrellas, corazones) o de uno en uno (número), en su rango', () => {
    const valor = (content: Record<string, unknown>) => documentoValido({ elements: [{ id: 'r', type: 'rating', content }] }).elements[0].content;
    expect(valor({ scale: 'hearts', value: 3.3 })).toEqual({ scale: 'hearts', value: 3.5 });
    expect(valor({ scale: 'number', value: 12 })).toEqual({ scale: 'number', value: 10 });
    expect(valor({ scale: 'otra', value: -1 })).toEqual({ scale: 'stars', value: 0 });
  });

  it('una cita guarda texto, quién, capítulo y comentario; un libro, su pieza', () => {
    const [c, l] = documentoValido({
      elements: [
        { id: 'c', type: 'quote', z: 1, content: { text: 'Andábamos', who: 'Horacio' } },
        { id: 'l', type: 'book', z: 2, content: { itemId: 'l1' } },
      ],
    }).elements;
    expect(c.content).toEqual({ text: 'Andábamos', who: 'Horacio', chapter: '', note: '' });
    expect(l.content).toEqual({ itemId: 'l1' });
  });

  it('al motor: fotos con su dirección, libro con portada o con su color y título', () => {
    let d = agregar(DOCUMENTO_VACIO, el('p', { type: 'polaroid', content: { variant: 'double', paths: ['u/l/anotaciones/f1.jpg', ''] } }));
    d = agregar(d, el('l', { type: 'book', content: { itemId: 'l1' } }));
    d = agregar(d, el('x', { type: 'book', content: { itemId: 'borrado' } }));
    const [p, l, x] = aMotor(d, {
      imagenes: new Map([['u/l/anotaciones/f1.jpg', 'https://r2/f1']]),
      libros: new Map([['l1', { title: 'Rayuela', color: '#2E7D32', src: 'https://r2/portada' }]]),
    });
    expect(p.content).toMatchObject({ variant: 'double', srcs: ['https://r2/f1', ''] });
    expect(l.content).toEqual({ title: 'Rayuela', coverColor: '#2E7D32', src: 'https://r2/portada' });
    expect(x.content).toEqual({ title: '', coverColor: '#8C8C8C' });
  });

  it('los archivos de imagen de unos elementos: las imágenes y las fotos de las polaroids', () => {
    let d = agregar(DOCUMENTO_VACIO, el('img', { type: 'image', content: { path: 'u/l/anotaciones/img.jpg' } }));
    d = agregar(d, el('p', { type: 'polaroid', content: { variant: 'film', paths: ['u/l/anotaciones/f1.jpg', '', 'u/l/anotaciones/f3.jpg'] } }));
    d = agregar(d, el('s'));
    expect(archivosDeImagenes(d.elements)).toEqual(['img', 'f1', 'f3']);
    expect(rutasDeImagenes(d.elements)).toEqual(['u/l/anotaciones/img.jpg', 'u/l/anotaciones/f1.jpg', 'u/l/anotaciones/f3.jpg']);
  });
});

describe('assets (RF-CC13, RF-CC15; T343b)', () => {
  it('guardan cuál son, su nombre y cómo se recolorean; al motor va su color', () => {
    const [a, b] = documentoValido({
      elements: [
        { id: 'a', type: 'asset', z: 1, content: { asset: 'basicos/papel-rasgado', label: 'Papel rasgado', mode: 'textura' }, style: { color: '#7A1E3A' } },
        { id: 'b', type: 'asset', z: 2, content: { asset: 'basicos/destellos', mode: 'trazo' } },
      ],
    }).elements;
    expect(a.content).toEqual({ asset: 'basicos/papel-rasgado', label: 'Papel rasgado', mode: 'textura' });
    expect(b.content).toEqual({ asset: 'basicos/destellos', mode: 'trazo' });
    const [m] = aMotor({ pages: 1, elements: [a] });
    expect(m).toMatchObject({ kind: 'asset', content: { asset: 'basicos/papel-rasgado', mode: 'textura', color: '#7A1E3A', label: 'Papel rasgado' } });
  });
});
