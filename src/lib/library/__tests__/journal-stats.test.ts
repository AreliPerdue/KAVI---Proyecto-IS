/** Los datos de la biblioteca en el Journal (spec 13h, RF-CC22; T349): se cuentan de lo que hay, en vivo. */
import { claveDeDato, numeroDeDato, valorDeDato, valoresDeDatos } from '@/lib/library/journal-stats';

const pieza = (id: string, progress: number, page_count: number | null = 300, kind = 'pdf') => ({ id, kind, progress, page_count });
const sesion = (item_id: string, ended_at: string, seconds: number, start_progress: number | null, end_progress: number | null) => ({ item_id, ended_at, seconds, start_progress, end_progress });

const piezas = [pieza('a', 1), pieza('b', 1), pieza('c', 0.4), pieza('d', 1), pieza('j', 1, 120, 'journal')];
const sesiones = [
  sesion('a', '2026-03-01T10:00:00Z', 3600, 0, 0.5),
  sesion('a', '2026-03-05T10:00:00Z', 1800, 0.5, 1),
  sesion('b', '2025-12-20T10:00:00Z', 7200, 0, 1),
  sesion('c', '2026-06-01T10:00:00Z', 900, 0.2, 0.4),
  sesion('j', '2026-06-01T10:00:00Z', 9999, 0, 1),
];

it('libros terminados: en un año, los que terminaron ese año; de siempre, todos (aunque no tengan sesiones)', () => {
  expect(valorDeDato('booksFinished', 2026, piezas, sesiones)).toBe(1);
  expect(valorDeDato('booksFinished', 2025, piezas, sesiones)).toBe(1);
  expect(valorDeDato('booksFinished', null, piezas, sesiones)).toBe(3);
});

it('páginas leídas: lo que avanzó cada sesión por las páginas de su libro', () => {
  expect(valorDeDato('pagesRead', 2026, piezas, sesiones)).toBe(300 + 60);
  expect(valorDeDato('pagesRead', null, piezas, sesiones)).toBe(300 + 300 + 60);
});

it('horas leídas: el tiempo de las sesiones; los Journals no cuentan', () => {
  expect(valorDeDato('hoursRead', 2026, piezas, sesiones)).toBeCloseTo(1.75);
  expect(valorDeDato('hoursRead', null, piezas, sesiones)).toBeCloseTo(3.75);
});

it('cada dato pedido se cuenta una vez, por su clave', () => {
  const v = valoresDeDatos([{ dato: 'booksFinished', anio: 2026 }, { dato: 'booksFinished', anio: 2026 }, { dato: 'hoursRead', anio: null }], piezas, sesiones);
  expect([...v.keys()]).toEqual([claveDeDato('booksFinished', 2026), claveDeDato('hoursRead', null)]);
});

it('el número como se lee: horas con un decimal si son pocas, miles con separador', () => {
  expect(numeroDeDato('hoursRead', 1.75, 'es')).toBe('1.8');
  expect(numeroDeDato('hoursRead', 42.4, 'es')).toBe('42');
  expect(numeroDeDato('pagesRead', 12345, 'en')).toBe('12,345');
});
