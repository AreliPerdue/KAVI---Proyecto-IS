/** Fichas de calificación (spec 13d; T293): plantillas incluidas, campos, aspecto y versiones (RF-BF5). */
import {
  ASPECTO_POR_OMISION,
  aspectoDe,
  cambioDeDiseno,
  campoNuevo,
  camposDe,
  fichasPorPlantilla,
  moverCampo,
  plantillasIncluidas,
  plantillasVigentes,
  problemaDeDiseno,
} from '@/lib/library/cards';
import { es } from '@/i18n/es';
import type { LibraryCardTemplate } from '@/types/domain';

const plantilla = (x: Partial<LibraryCardTemplate>): LibraryCardTemplate => ({
  id: 'p',
  owner_id: 'u1',
  name: 'P',
  fields: [],
  look: {},
  created_at: '2026-10-19T10:00:00Z',
  updated_at: '2026-10-19T10:00:00Z',
  ...x,
});

it('las incluidas: Reseña rápida (5 y 10 + notas), Diario de lectura y Romance, con ids de campo fijos', () => {
  const [rapida, diario, romance] = plantillasIncluidas(es.library.cards.included);
  expect(rapida.name).toBe('Reseña rápida');
  expect(rapida.fields.map((c) => [c.id, c.type, c.max])).toEqual([
    ['stars', 'scale', 5],
    ['rating', 'scale', 10],
    ['notes', 'text', undefined],
  ]);
  expect(diario.fields.map((c) => c.id)).toEqual(['stars', 'genre', 'started', 'finished', 'quote', 'notes']);
  expect(romance.fields.find((c) => c.id === 'spice')).toMatchObject({ type: 'scale', symbol: 'flame' });
  expect(romance.fields.find((c) => c.id === 'tropes')).toMatchObject({ type: 'choice', multiple: true });
  // Todas pasan su propia revisión.
  for (const p of [rapida, diario, romance]) expect(camposDe(p.fields)).toEqual(p.fields);
});

it('los campos guardados se revisan: tipos, topes, ids repetidos y opciones vacías o repetidas', () => {
  expect(
    camposDe([
      { id: 'a', type: 'scale', label: ' Estrellas ', max: 7, symbol: 'unicornio' },
      { id: 'a', type: 'text', label: 'repetido' },
      { id: 'b', type: 'choice', label: 'Género', options: ['Fantasía', ' Fantasía ', '', 3], multiple: 'sí' },
      { id: 'c', type: 'video', label: 'x' },
      'nada',
    ]),
  ).toEqual([
    { id: 'a', type: 'scale', label: 'Estrellas', max: 5, symbol: 'star' },
    { id: 'b', type: 'choice', label: 'Género', options: ['Fantasía'], multiple: false },
  ]);
  expect(camposDe(Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, type: 'date', label: 'f' })))).toHaveLength(20);
});

it('el aspecto guardado se revisa: color, fondo, letra y hasta tres stickers', () => {
  expect(aspectoDe(null)).toEqual(ASPECTO_POR_OMISION);
  expect(
    aspectoDe({
      color: '#e24947',
      background: 'dots',
      font: 'comic',
      stickers: [{ sticker: 'nobi-pink/idea', corner: 'bl', size: 'l', rot: 90 }, { sticker: '' }, { sticker: 'a/b' }, { sticker: 'a/c' }, { sticker: 'a/d' }],
    }),
  ).toEqual({
    color: '#E24947',
    background: 'dots',
    font: 'system',
    stickers: [
      { sticker: 'nobi-pink/idea', corner: 'bl', size: 'l', rot: 20 },
      { sticker: 'a/b', corner: 'tr', size: 'm', rot: 0 },
      { sticker: 'a/c', corner: 'tr', size: 'm', rot: 0 },
    ],
  });
});

it('qué le falta a un diseño para guardarse', () => {
  const escala = campoNuevo('scale', 'e', 'Estrellas');
  expect(problemaDeDiseno('  ', [escala])).toBe('name');
  expect(problemaDeDiseno('Mía', [])).toBe('noFields');
  expect(problemaDeDiseno('Mía', [{ ...escala, label: ' ' }])).toBe('label');
  expect(problemaDeDiseno('Mía', [campoNuevo('choice', 'g', 'Género')])).toBe('options');
  expect(problemaDeDiseno('Mía', [escala])).toBeNull();
});

it('mover un campo; fuera de rango no cambia nada', () => {
  const lista = ['a', 'b', 'c'].map((id) => campoNuevo('date', id, id));
  expect(moverCampo(lista, 0, 2).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  expect(moverCampo(lista, 2, 3).map((c) => c.id)).toEqual(['a', 'b', 'c']);
});

it('renombrar un campo es un cambio; el orden de las propiedades no', () => {
  const base = { name: 'Romance', fields: [campoNuevo('scale', 's', 'Estrellas')], look: {} };
  expect(cambioDeDiseno(base, { ...base, look: { ...ASPECTO_POR_OMISION } })).toBe(false);
  expect(cambioDeDiseno(base, { ...base, fields: [{ ...base.fields[0], label: 'Calificación' }] })).toBe(true);
});

it('cuenta fichas por plantilla y deja fuera las archivadas', () => {
  expect(fichasPorPlantilla([{ template_id: 'a' }, { template_id: 'a' }, { template_id: 'b' }])).toEqual(new Map([['a', 2], ['b', 1]]));
  const lista = [plantilla({ id: 'nueva', created_at: '2026-10-20' }), plantilla({ id: 'vieja', archived: true }), plantilla({ id: 'otra', created_at: '2026-10-01' })];
  expect(plantillasVigentes(lista).map((p) => p.id)).toEqual(['otra', 'nueva']);
});
