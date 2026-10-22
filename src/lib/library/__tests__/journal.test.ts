/** El Journal como objeto (spec 13i, RF-JC1 – RF-JC9; T345). */
import { cabeOtraPagina, conAutora, contraportada, fondoDeCara, lomoDeJournal, nombreDeAutora, paginasEnOrden, paraHojear, proporcionDeCara, tapasDe, PAGINAS, paginasValidas, PORTADA_POR_OMISION, portadaValida } from '@/lib/library/journal';
import { grosorDeLomo } from '@/lib/library/spines';

it('una portada rota vuelve a lo de omisión: A5 vertical, tapa dura, cuero gris y cantos blancos', () => {
  expect(portadaValida(null)).toEqual(PORTADA_POR_OMISION);
  expect(portadaValida({ binding: 'grapas', material: 'plastico', color: 'rojo' })).toEqual(PORTADA_POR_OMISION);
});

it('se queda con lo que entiende, en mayúscula, y la contraportada propia o la de la portada', () => {
  const p = portadaValida({ orientation: 'landscape', binding: 'spiral', material: 'wood', color: '#3b2a20', back: { material: 'linen', color: '#112233' }, edges: '#ffeedd', accent: '#c0c0c0' });
  expect(p).toEqual({ orientation: 'landscape', binding: 'spiral', material: 'wood', color: '#3B2A20', back: { material: 'linen', color: '#112233' }, edges: '#FFEEDD', accent: '#C0C0C0' });
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

  it('hojear abre con la portada y cierra con la contraportada, cada una con su material y lo decorado', () => {
    const { doc, fondos } = paraHojear([{ doc: { pages: 1, elements: [el('a')] } }], { portada, front: { doc: { pages: 1, elements: [el('t')] } } });
    expect(doc.pages).toBe(3);
    expect(doc.elements.map((e) => [e.id, e.page])).toEqual([
      ['t', 1],
      ['a', 2],
    ]);
    expect(fondos).toEqual({ '1': { material: 'wood', color: '#6B3E26' }, '3': { material: 'linen', color: '#112233' } });
  });
});
