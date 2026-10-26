/** El Journal como objeto (spec 13i, RF-JC1 – RF-JC9; T345). */
import { cabeOtraPagina, conAutora, contraportada, fondoDeCara, lomoDeJournal, nombreDeAutora, paginasEnOrden, paraHojear, proporcionDeCara, tapasDe, PAGINAS, paginasValidas, PORTADA_POR_OMISION, portadaValida } from '@/lib/library/journal';
import { grosorDeLomo } from '@/lib/library/spines';

it('una portada rota vuelve a lo de omisión: A5 vertical, tapa dura, cuero gris y cantos blancos', () => {
  expect(portadaValida(null)).toEqual(PORTADA_POR_OMISION);
  expect(portadaValida({ binding: 'grapas', material: 'plastico', color: 'rojo' })).toEqual(PORTADA_POR_OMISION);
});

it('se queda con lo que entiende, en mayúscula, y la contraportada propia o la de la portada', () => {
  const p = portadaValida({ orientation: 'landscape', binding: 'spiral', material: 'wood', color: '#3b2a20', back: { material: 'linen', color: '#112233' }, edges: '#ffeedd', accent: '#c0c0c0' });
  expect(p).toEqual({
    orientation: 'landscape',
    binding: 'spiral',
    material: 'wood',
    color: '#3B2A20',
    back: { material: 'linen', color: '#112233' },
    edges: '#FFEEDD',
    accent: '#C0C0C0',
    // Sin guardas, papel crema (T367).
    endpaper: { material: 'parchment', color: '#EDE3CF' },
  });
  expect(portadaValida({ endpaper: { material: 'velvet', color: '#7a1e3a' } }).endpaper).toEqual({ material: 'velvet', color: '#7A1E3A' });
  expect(contraportada(p)).toEqual({ material: 'linen', color: '#112233' });
  expect(contraportada({ ...p, back: null })).toEqual({ material: 'wood', color: '#3B2A20' });
});

it('las páginas van de 20 en 20, de 20 a 400', () => {
  expect(paginasValidas(130)).toBe(140);
  expect(paginasValidas(0)).toBe(PAGINAS.min);
  expect(paginasValidas(9999)).toBe(PAGINAS.max);
  expect(paginasValidas('x')).toBe(PAGINAS.porOmision);
});

it('el lomo engorda con las páginas como el de un libro con esas páginas (RF-JC5)', () => {
  expect(lomoDeJournal(240)).toBe(grosorDeLomo(240));
  expect(lomoDeJournal(240)).toBeGreaterThan(lomoDeJournal(120));
});

it('quien escribe un Journal es su dueña: su nombre visible o su usuario', () => {
  expect(nombreDeAutora({ display_name: ' Areli Perdue ', username: 'areli' })).toBe('Areli Perdue');
  expect(nombreDeAutora({ display_name: '', username: 'areli' })).toBe('areli');
  expect(nombreDeAutora(null)).toBeNull();
});

it('los Journals sin autor llevan el nombre de su dueña; los libros y los que ya tienen, no cambian', () => {
  const piezas = [
    { kind: 'journal', authors: [] as string[] },
    { kind: 'journal', authors: ['Otra'] },
    { kind: 'pdf', authors: [] as string[] },
  ];
  expect(conAutora(piezas, 'Areli').map((p) => p.authors)).toEqual([['Areli'], ['Otra'], []]);
  expect(conAutora(piezas, null)).toBe(piezas);
  const sinCambio = [piezas[1], piezas[2]];
  expect(conAutora(sinCambio, 'Areli')).toBe(sinCambio);
});

describe('páginas (T347)', () => {
  const el = (id: string, page = 1) => ({ id, type: 'textbox' as const, page, x: 0, y: 0, w: 0.5, ar: 0.3, rot: 0, z: 1, locked: false, group: null, style: {}, content: { text: id } });

  it('van en el orden en que se hicieron', () => {
    const lista = [
      { id: 'b', created_at: '2026-10-22T00:00:00Z' },
      { id: 'a', created_at: '2026-10-21T00:00:00Z' },
    ];
    expect(paginasEnOrden(lista).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('cabe otra mientras no se usen todas las del Journal', () => {
    expect(cabeOtraPagina(119, 120)).toBe(true);
    expect(cabeOtraPagina(120, 120)).toBe(false);
    expect(cabeOtraPagina(0, null)).toBe(true);
  });

  it('para hojear, cada página va en la suya, bloqueada y con su color; solo su primera hoja', () => {
    const { doc, fondos } = paraHojear([
      { doc: { pages: 1, elements: [el('a')] } },
      { doc: { pages: 2, background: '#112233', elements: [el('b'), el('c', 2)] } },
    ]);
    expect(doc.pages).toBe(2);
    expect(doc.elements.map((e) => [e.id, e.page, e.locked])).toEqual([
      ['a', 1, true],
      ['b', 2, true],
    ]);
    expect(fondos).toEqual({ '2': '#112233' });
    expect(paraHojear([]).doc.pages).toBe(1);
  });
});

describe('tapas (T346)', () => {
  const el = (id: string) => ({ id, type: 'textbox' as const, page: 1, x: 0, y: 0, w: 0.5, ar: 0.3, rot: 0, z: 1, locked: false, group: null, style: {}, content: { text: id } });
  const portada = portadaValida({ material: 'wood', color: '#6B3E26', back: { material: 'linen', color: '#112233' } });

  it('cada cara tiene a lo más una tapa, y las tapas no son páginas', () => {
    const lienzos = [
      { id: 'p', context: 'journal', face: null, created_at: '1' },
      { id: 'f', context: 'cover', face: 'front', created_at: '2' },
      { id: 's', context: 'cover', face: 'spine', created_at: '3' },
    ];
    expect(Object.fromEntries(Object.entries(tapasDe(lienzos)).map(([k, v]) => [k, v?.id]))).toEqual({ front: 'f', spine: 's' });
    expect(paginasEnOrden(lienzos).map((l) => l.id)).toEqual(['p']);
  });

  it('la portada es A5; el lomo, alto y angosto como en el librero, y engorda con las páginas', () => {
    expect(proporcionDeCara('portrait', 'front', 120)).toBeCloseTo(Math.SQRT2);
    expect(proporcionDeCara('landscape', 'back', 120)).toBeCloseTo(1 / Math.SQRT2);
    expect(proporcionDeCara('portrait', 'spine', 400)).toBeLessThan(proporcionDeCara('portrait', 'spine', 40));
  });

  it('se decora sobre su material: la contraportada, el suyo si lo tiene', () => {
    expect(fondoDeCara(portada, 'front')).toEqual({ material: 'wood', color: '#6B3E26' });
    expect(fondoDeCara(portada, 'spine')).toEqual({ material: 'wood', color: '#6B3E26' });
    expect(fondoDeCara(portada, 'back')).toEqual({ material: 'linen', color: '#112233' });
  });

  it('hojear: portada, guarda, páginas, (hoja en blanco si son impares), guarda y contraportada (T346, T367)', () => {
    // Cada guarda es el interior de su tapa con el papel pegado, que llega al lomo (T370).
    const papel = { material: 'parchment', color: '#EDE3CF' };
    const adentroDeLaPortada = { material: 'wood', color: '#6B3E26', inner: { ...papel, hinge: 'right' } };
    const adentroDeLaContraportada = { material: 'linen', color: '#112233', inner: { ...papel, hinge: 'left' } };
    const una = paraHojear([{ doc: { pages: 1, elements: [el('a')] } }], { portada, front: { doc: { pages: 1, elements: [el('t')] } } });
    // 1 portada · 2 guarda · 3 página 1 · 4 en blanco · 5 guarda · 6 contraportada: así cierra sola en libro real.
    expect(una.doc.pages).toBe(6);
    expect(una.primeraPagina).toBe(3);
    expect(una.doc.elements.map((e) => [e.id, e.page])).toEqual([
      ['t', 1],
      ['a', 3],
    ]);
    expect(una.fondos).toEqual({ '1': { material: 'wood', color: '#6B3E26' }, '2': adentroDeLaPortada, '5': adentroDeLaContraportada, '6': { material: 'linen', color: '#112233' } });
    const dos = paraHojear([{ doc: { pages: 1, elements: [] } }, { doc: { pages: 1, elements: [] } }], { portada });
    expect(dos.doc.pages).toBe(6);
    expect(Object.keys(dos.fondos)).toEqual(['1', '2', '5', '6']);
    const ninguna = paraHojear([], { portada });
    expect([ninguna.doc.pages, Object.keys(ninguna.fondos)]).toEqual([4, ['1', '2', '3', '4']]);
  });
});
