/** El Journal como objeto (spec 13i, RF-JC1 – RF-JC9; T345). */
import { conAutora, contraportada, lomoDeJournal, nombreDeAutora, PAGINAS, paginasValidas, PORTADA_POR_OMISION, portadaValida } from '@/lib/library/journal';
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
