/** Sagas (RF-BL24 – RF-BL26, T315): etiqueta, pilas, el siguiente y leer el número. */
import { agruparSagas, etiquetaDeSaga, leerNumeroDeSaga, numeroDeSaga, porNumero, sagaPorNombre, siguienteDeSaga, vistaDeSagasValida } from '@/lib/library/series';
import type { LibraryItem, LibrarySeries } from '@/types/domain';

const saga = (id: string, name: string) => ({ id, name, owner_id: 'u', created_at: '', updated_at: '' }) as LibrarySeries;
const pieza = (id: string, extra: Partial<LibraryItem> = {}) => ({ id, title: id, series_id: null, series_index: null, progress: 0, ...extra }) as LibraryItem;
const acotar = saga('s1', 'ACOTAR');

it('etiqueta y número como los escribe una persona', () => {
  expect(etiquetaDeSaga('ACOTAR', 2)).toBe('ACOTAR #2');
  expect(etiquetaDeSaga('ACOTAR', 1.5)).toBe('ACOTAR #1.5');
  expect(etiquetaDeSaga('ACOTAR', null)).toBe('ACOTAR');
  expect(numeroDeSaga(3)).toBe('3');
});

it('leer el número: coma o punto; vacío o negativo no cuenta', () => {
  expect(leerNumeroDeSaga('2')).toBe(2);
  expect(leerNumeroDeSaga('1,5')).toBe(1.5);
  expect(leerNumeroDeSaga('')).toBeNull();
  expect(leerNumeroDeSaga('-1')).toBeNull();
  expect(leerNumeroDeSaga('abc')).toBeNull();
});

it('dentro de una saga, por número; sin número al final', () => {
  const lista = [pieza('c', { series_index: null }), pieza('b', { series_index: 2 }), pieza('a', { series_index: 1 })];
  expect([...lista].sort(porNumero).map((p) => p.id)).toEqual(['a', 'b', 'c']);
});

it('apiladas: la saga va en el lugar de su primer libro y en orden de número; de un solo libro no se apila', () => {
  const items = [
    pieza('x'),
    pieza('a3', { series_id: 's1', series_index: 3 }),
    pieza('y'),
    pieza('a1', { series_id: 's1', series_index: 1 }),
    pieza('b1', { series_id: 's2', series_index: 1 }),
  ];
  const entradas = agruparSagas(items, [acotar, saga('s2', 'Solo uno')]);
  expect(entradas.map((e) => (e.tipo === 'saga' ? `saga:${e.piezas.map((p) => p.id).join(',')}` : e.pieza.id))).toEqual(['x', 'saga:a1,a3', 'y', 'b1']);
});

it('el siguiente: el de número más chico que aún no se termina', () => {
  const items = [
    pieza('a1', { series_id: 's1', series_index: 1 }),
    pieza('a2', { series_id: 's1', series_index: 2, progress: 1 }),
    pieza('a3', { series_id: 's1', series_index: 3 }),
    pieza('a4', { series_id: 's1', series_index: 4 }),
  ];
  expect(siguienteDeSaga(items[0], items)?.id).toBe('a3');
  expect(siguienteDeSaga(items[3], items)).toBeNull();
  expect(siguienteDeSaga(pieza('suelto'), items)).toBeNull();
});

it('buscar una saga por nombre sin importar mayúsculas ni espacios', () => {
  expect(sagaPorNombre([acotar], '  acotar ')?.id).toBe('s1');
  expect(sagaPorNombre([acotar], 'otra')).toBeNull();
});

it('la vista guardada que no existe vuelve a sueltas', () => {
  expect(vistaDeSagasValida('stacked')).toBe('stacked');
  expect(vistaDeSagasValida('rara')).toBe('loose');
});
