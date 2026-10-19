/** Lo que se dicen la app y el motor de lectura (spec 13b §4, T279). */
import { cambioDePosicion, ColaDelMotor, leerMensaje, posicionGuardada } from '@/lib/library/reader-protocol';

describe('leerMensaje', () => {
  it.each([
    ['{"type":"ready"}', { type: 'ready' }],
    [{ type: 'opened', total: 12 }, { type: 'opened', total: 12, copiable: true }],
    [{ type: 'opened', total: 12, copiable: false }, { type: 'opened', total: 12, copiable: false }],
    [{ type: 'opened', total: null, lang: 'es-MX' }, { type: 'opened', total: null, copiable: true, lang: 'es-MX' }],
    [{ type: 'opened', total: null, lang: '<script>' }, { type: 'opened', total: null, copiable: true }],
    [{ type: 'opened', total: null }, { type: 'opened', total: null, copiable: true }],
    [{ type: 'position', page: 3, total: 12, fraction: 0.25 }, { type: 'position', page: 3, total: 12, fraction: 0.25, cfi: undefined }],
    [{ type: 'position', cfi: 'epubcfi(/6/2!/4)', fraction: 1.4 }, { type: 'position', cfi: 'epubcfi(/6/2!/4)', fraction: 1, page: undefined, total: undefined }],
    [{ type: 'search', count: 3, index: 0, searching: true }, { type: 'search', count: 3, index: 0, searching: true }],
    [{ type: 'cover', dataUrl: 'data:image/jpeg;base64,AAA' }, { type: 'cover', dataUrl: 'data:image/jpeg;base64,AAA' }],
    [{ type: 'tap' }, { type: 'tap' }],
    [{ type: 'position', page: 2, pageEnd: 3, total: 340, fraction: 0.01 }, { type: 'position', page: 2, pageEnd: 3, total: 340, fraction: 0.01, cfi: undefined }],
    [{ type: 'position', page: 2, pageEnd: 2, total: 340, fraction: 0.01 }, { type: 'position', page: 2, total: 340, fraction: 0.01, cfi: undefined }],
    // Con letra grande en un PDF, la pantalla de la página (T340); una sola pantalla o fuera de rango no se manda.
    [{ type: 'position', page: 12, total: 340, fraction: 0.03, screen: 2, screens: 3 }, { type: 'position', page: 12, total: 340, fraction: 0.03, cfi: undefined, screen: 2, screens: 3 }],
    [{ type: 'position', page: 12, total: 340, fraction: 0.03, screen: 4, screens: 3 }, { type: 'position', page: 12, total: 340, fraction: 0.03, cfi: undefined }],
    [{ type: 'error', code: 'password' }, { type: 'error', code: 'password', message: undefined }],
    [{ type: 'error', code: 'raro', message: 'x' }, { type: 'error', code: 'unknown', message: 'x' }],
  ])('%j', (crudo, esperado) => {
    expect(leerMensaje(crudo)).toEqual(esperado);
  });

  it.each([
    ['texto que no es JSON', '{nope'],
    ['un tipo que no existe', { type: 'borrarTodo' }],
    ['posición sin fracción', { type: 'position', page: 2 }],
    ['portada que no es imagen', { type: 'cover', dataUrl: 'javascript:alert(1)' }],
    ['nada', null],
  ])('ignora %s', (_, crudo) => {
    expect(leerMensaje(crudo)).toBeNull();
  });
});

describe('leerMensaje · capa de anotaciones (T286)', () => {
  it.each([
    [{ type: 'place', locator: { page: 2, x: 0.1, y: 0.2, w: 0.24 } }, { type: 'place', locator: { page: 2, x: 0.1, y: 0.2, w: 0.24 } }],
    [{ type: 'select', id: 'a1' }, { type: 'select', id: 'a1' }],
    [{ type: 'select', id: null }, { type: 'select', id: null }],
    [{ type: 'move', id: 'a1', locator: { cfi: 'epubcfi(/6/4)', x: 0.3, w: 0.24, fraction: 0.5 } }, { type: 'move', id: 'a1', locator: { cfi: 'epubcfi(/6/4)', x: 0.3, w: 0.24, fraction: 0.5 } }],
    [{ type: 'edit', id: 'a1' }, { type: 'edit', id: 'a1' }],
    [{ type: 'remove', id: 'a1' }, { type: 'remove', id: 'a1' }],
    [{ type: 'fold', id: 'a1', folded: false }, { type: 'fold', id: 'a1', folded: false }],
    [{ type: 'move', id: 'a1', locator: { page: 1, x: 0.1, y: 0.1, w: 0.3 }, rot: -30 }, { type: 'move', id: 'a1', locator: { page: 1, x: 0.1, y: 0.1, w: 0.3 }, rot: 330 }],
    [{ type: 'selection', text: '' }, { type: 'selection', text: '', locator: null }],
    [{ type: 'zoom', level: 1.5 }, { type: 'zoom', level: 1.5 }],
    [{ type: 'text', id: 'a1', text: 'Hola' }, { type: 'text', id: 'a1', text: 'Hola' }],
    [{ type: 'rotate', id: 'a1', rot: 370.4 }, { type: 'rotate', id: 'a1', rot: 10 }],
    [{ type: 'rotate', id: 'a1', rot: -90 }, { type: 'rotate', id: 'a1', rot: 270 }],
    [{ type: 'zoom', level: 9 }, { type: 'zoom', level: 4 }],
    [{ type: 'textSize', size: 133 }, { type: 'textSize', size: 130 }],
    [
      { type: 'selection', text: '  la\nciudad ', locator: { rects: [{ page: 3, x: 0.1, y: 0.4, w: 0.5, h: 0.02 }] } },
      { type: 'selection', text: 'la ciudad', locator: { page: 3, y: 0.4, rects: [{ page: 3, x: 0.1, y: 0.4, w: 0.5, h: 0.02 }] } },
    ],
    [
      { type: 'selection', text: 'mapa', locator: { cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:7)', fraction: 0.2 } },
      { type: 'selection', text: 'mapa', locator: { cfi: 'epubcfi(/6/4!/4/2,/1:3,/1:7)', fraction: 0.2 } },
    ],
  ])('%j', (crudo, esperado) => {
    expect(leerMensaje(crudo)).toEqual(esperado);
  });

  it.each([
    { type: 'place', locator: { page: 2, x: 3, y: 0.2, w: 0.24 } },
    { type: 'place' },
    { type: 'select', id: 5 },
    { type: 'select' },
    { type: 'move', id: 'a1', locator: { page: 1 } },
    { type: 'move', locator: { page: 1, x: 0, y: 0, w: 0.2 } },
    { type: 'edit', id: '' },
    { type: 'selection', text: 'hola', locator: { rects: [{ page: 0, x: 0, y: 0, w: 1, h: 1 }] } },
    { type: 'selection', text: 'hola', locator: { rects: [] } },
    { type: 'zoom' },
    { type: 'text', id: 'a1' },
    { type: 'rotate', id: 'a1', rot: 'mucho' },
    { type: 'textSize', size: 'grande' },
  ])('ignora %j', (crudo) => {
    expect(leerMensaje(crudo)).toBeNull();
  });
});

describe('posicionGuardada (RF-BL17)', () => {
  it('PDF: la página donde se quedó', () => {
    expect(posicionGuardada({ kind: 'pdf', last_position: { page: 120 }, progress: 0.3 })).toEqual({ page: 120 });
    expect(posicionGuardada({ kind: 'pdf', last_position: null, progress: 0 })).toBeUndefined();
  });

  it('EPUB: el CFI y, si no hay, la fracción', () => {
    expect(posicionGuardada({ kind: 'epub', last_position: { cfi: 'epubcfi(/6/4)' }, progress: 0.5 })).toEqual({ cfi: 'epubcfi(/6/4)' });
    expect(posicionGuardada({ kind: 'epub', last_position: null, progress: 0.5 })).toEqual({ fraction: 0.5 });
    expect(posicionGuardada({ kind: 'epub', last_position: null, progress: 0 })).toBeUndefined();
  });
});

describe('cambioDePosicion (RF-BR9)', () => {
  it('PDF: página y avance página/total, con 4 decimales', () => {
    expect(cambioDePosicion({ type: 'position', page: 4, total: 12, fraction: 0.33 })).toEqual({ last_position: { page: 4 }, progress: 0.3333 });
    expect(cambioDePosicion({ type: 'position', page: 12, total: 12, fraction: 1 })).toEqual({ last_position: { page: 12 }, progress: 1 });
  });

  it('EPUB: el CFI y la fracción; casi al final cuenta como terminado', () => {
    expect(cambioDePosicion({ type: 'position', cfi: 'c1', fraction: 0.45678 })).toEqual({ last_position: { cfi: 'c1' }, progress: 0.4568 });
    expect(cambioDePosicion({ type: 'position', cfi: 'c2', fraction: 0.997 })).toEqual({ last_position: { cfi: 'c2' }, progress: 1 });
  });
});

describe('ColaDelMotor', () => {
  it('guarda lo que se manda antes de ready y lo manda en orden', () => {
    const mandados: string[] = [];
    const cola = new ColaDelMotor((t) => mandados.push(t));
    cola.enviar({ type: 'open', format: 'pdf', url: 'u' });
    cola.enviar({ type: 'goTo', page: 3 });
    expect(mandados).toEqual([]);
    cola.marcarListo();
    expect(mandados.map((t) => JSON.parse(t).type)).toEqual(['open', 'goTo']);
    cola.enviar({ type: 'searchClear' });
    expect(mandados).toHaveLength(3);
  });

  it('si el motor se recarga, vuelve a esperar', () => {
    const mandados: string[] = [];
    const cola = new ColaDelMotor((t) => mandados.push(t));
    cola.marcarListo();
    cola.reiniciar();
    cola.enviar({ type: 'searchClear' });
    expect(mandados).toEqual([]);
    cola.marcarListo();
    expect(mandados).toHaveLength(1);
  });
});
