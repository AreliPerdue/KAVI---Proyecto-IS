/** Mis reseñas (spec 13d, RF-BF8 – RF-BF10; T295): campos filtrables, filtros, orden y totales. */
import { aniosDe, camposFiltrables, filtrarResenas, ordenarResenas, totalesDeResenas } from '@/lib/library/reviews';
import type { LibraryCard, LibraryCardTemplate } from '@/types/domain';

const plantilla = (id: string, fields: LibraryCardTemplate['fields']): LibraryCardTemplate => ({ id, owner_id: 'u1', name: id, fields, look: {}, created_at: 'c', updated_at: 'u' });
const ROMANCE = plantilla('romance', [
  { id: 'stars', type: 'scale', label: 'Estrellas', max: 5, symbol: 'heart' },
  { id: 'spice', type: 'scale', label: 'Picante', max: 5, symbol: 'flame' },
  { id: 'tropes', type: 'choice', label: 'Tropes', options: ['Slow burn', 'Fake dating'], multiple: true },
]);
const DIARIO = plantilla('diario', [
  { id: 'stars', type: 'scale', label: 'Estrellas', max: 5, symbol: 'star' },
  { id: 'genre', type: 'choice', label: 'Género', options: ['Fantasía', 'Romance'] },
  { id: 'finished', type: 'date', label: 'Terminé' },
  { id: 'notes', type: 'text', label: 'Notas' },
]);
const RAPIDA = plantilla('rapida', [{ id: 'rating', type: 'scale', label: 'Calificación', max: 10, symbol: 'star' }]);
let n = 0;
const ficha = (template_id: string, item_id: string, values: Record<string, unknown>, updated_at = `2026-10-${String(++n).padStart(2, '0')}`): LibraryCard => ({
  id: `f${n}`,
  item_id,
  template_id,
  owner_id: 'u1',
  values,
  placement: 'back',
  created_at: updated_at,
  updated_at,
});

const plantillas = [ROMANCE, DIARIO, RAPIDA];
const fichas = [
  ficha('romance', 'l1', { stars: 5, spice: 4, tropes: ['Slow burn'] }),
  ficha('romance', 'l2', { stars: 3, spice: 2, tropes: ['Fake dating', 'Slow burn'] }),
  ficha('diario', 'l1', { stars: 4, genre: ['Fantasía'], finished: '2026-03-02' }),
  ficha('diario', 'l3', { stars: 2, genre: ['Fantasía'], finished: '2025-12-30' }),
  ficha('rapida', 'l4', { rating: 9 }),
];

it('los campos filtrables son las escalas, opciones y fechas de las plantillas usadas, juntados por id', () => {
  const campos = camposFiltrables(plantillas, fichas);
  expect(campos.map((c) => [c.id, c.type])).toEqual([
    ['stars', 'scale'],
    ['spice', 'scale'],
    ['tropes', 'choice'],
    ['genre', 'choice'],
    ['finished', 'date'],
    ['rating', 'scale'],
  ]);
  expect(camposFiltrables(plantillas, [fichas[4]]).map((c) => c.id)).toEqual(['rating']);
});

it('"picante 4 o más", "Estrellas 4 o más" de todas las plantillas, una opción y un año', () => {
  expect(filtrarResenas(fichas, plantillas, [{ campo: 'spice', tipo: 'scale', min: 4 }]).map((f) => f.item_id)).toEqual(['l1']);
  expect(filtrarResenas(fichas, plantillas, [{ campo: 'stars', tipo: 'scale', min: 4 }])).toHaveLength(2);
  expect(filtrarResenas(fichas, plantillas, [{ campo: 'tropes', tipo: 'choice', opcion: 'Slow burn' }])).toHaveLength(2);
  expect(filtrarResenas(fichas, plantillas, [{ campo: 'finished', tipo: 'date', anio: 2026 }]).map((f) => f.item_id)).toEqual(['l1']);
  expect(
    filtrarResenas(fichas, plantillas, [
      { campo: 'stars', tipo: 'scale', min: 3 },
      { campo: 'tropes', tipo: 'choice', opcion: 'Fake dating' },
    ]).map((f) => f.item_id),
  ).toEqual(['l2']);
  expect(aniosDe(fichas, plantillas, 'finished')).toEqual([2026, 2025]);
});

it('ordena por recientes o por un campo (las que no lo tienen, al final)', () => {
  expect(ordenarResenas(fichas, plantillas, { por: 'recent' })[0].template_id).toBe('rapida');
  expect(ordenarResenas(fichas, plantillas, { por: 'field', campo: 'stars' }).map((f) => f.values.stars ?? '-')).toEqual([5, 4, 3, 2, '-']);
  expect(ordenarResenas(fichas, plantillas, { por: 'field', campo: 'finished' })[0].values.finished).toBe('2026-03-02');
});

it('totales: libros distintos, promedio de estrellas (las de 10 cuentan como la mitad) y género más leído', () => {
  expect(totalesDeResenas(fichas, plantillas)).toEqual({ libros: 4, promedio: 3.7, genero: 'Fantasía' });
  expect(totalesDeResenas([], plantillas)).toEqual({ libros: 0, promedio: null, genero: null });
});
