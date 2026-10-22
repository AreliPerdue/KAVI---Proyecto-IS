/** El Journal como objeto (spec 13i, RF-JC1 – RF-JC9; T345). */
import { cabeOtraPagina, conAutora, contraportada, lomoDeJournal, nombreDeAutora, paginasEnOrden, paraHojear, PAGINAS, paginasValidas, PORTADA_POR_OMISION, portadaValida } from '@/lib/library/journal';
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
