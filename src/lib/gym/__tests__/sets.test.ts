/** Operaciones del logger sobre series (spec 07 v2, §5). */
import {
  addDrop,
  addMiniSet,
  columnsFor,
  duplicateSet,
  formatSet,
  isImbalanced,
  newSet,
  removeSegment,
  segmentFieldValue,
  setSegmentField,
  sortOrderBetween,
} from '@/lib/gym/sets';
import { setVolume } from '@/lib/gym/volume';

const base = () => setSegmentField(setSegmentField(newSet('ex1', 1, null, 'kg'), 0, 'weight_kg', 100, 'kg'), 0, 'reps', 8, 'kg');

describe('nueva serie', () => {
  it('nace con un segmento main y pendiente', () => {
    const s = newSet('ex1', 1, null, 'kg');
    expect(s.segments).toHaveLength(1);
    expect(s.segments[0].kind).toBe('main');
    expect(s.completed_at).toBeNull();
  });

  it('se prellena con la anterior: repetirla es solo marcar ✓', () => {
    const siguiente = newSet('ex1', 2, base(), 'kg');
    expect(siguiente.segments[0]).toMatchObject({ weight_kg: 100, reps: 8 });
    expect(siguiente.id).not.toBe(base().id);
  });

  it('del calentamiento no hereda el tipo', () => {
    const cal = { ...base(), set_type: 'warmup' as const };
    expect(newSet('ex1', 2, cal, 'kg').set_type).toBe('working');
  });
});

describe('drop set triple = una serie con cuatro segmentos', () => {
  it('cada + drop baja 20 % y el volumen suma todo', () => {
    let s = base();
    s = addDrop(s, 20);
    s = setSegmentField(s, 1, 'reps', 6, 'kg');
    s = addDrop(s, 20);
    s = setSegmentField(s, 2, 'reps', 6, 'kg');
    s = addDrop(s, 20);
    s = setSegmentField(s, 3, 'reps', 8, 'kg');
    expect(s.segments.map((g) => [g.kind, g.weight_kg])).toEqual([['main', 100], ['drop', 80], ['drop', 65], ['drop', 52.5]]);
    expect(s.intensifiers).toEqual(['drop_set']);
    expect(setVolume(s, { trackingType: 'weight_reps', bodyweightKg: null })).toBe(800 + 480 + 390 + 420);
    expect(formatSet(s, 'kg')).toBe('100 × 8 → 80 × 6 → 65 × 6 → 52.5 × 8');
  });

  it('quitar el último drop quita también la etiqueta', () => {
    const s = removeSegment(addDrop(base(), 20), 1);
    expect(s.segments).toHaveLength(1);
    expect(s.intensifiers).toEqual([]);
  });

  it('el main no se puede quitar', () => {
    const s = base();
    expect(removeSegment(s, 0)).toBe(s);
  });
});

it('mini-serie: mismo peso tras 15 s', () => {
  const s = addMiniSet(base());
  expect(s.segments[1]).toMatchObject({ kind: 'rest_pause', weight_kg: 100, rest_before_sec: 15 });
});

it('duplicar da ids nuevos y la deja pendiente', () => {
  const hecha = { ...addDrop(base(), 20), completed_at: '2026-10-04T10:00:00Z' };
  const copia = duplicateSet(hecha, 5);
  expect(copia.id).not.toBe(hecha.id);
  expect(copia.segments.every((g) => g.set_id === copia.id)).toBe(true);
  expect(copia.segments.map((g) => g.id)).not.toEqual(hecha.segments.map((g) => g.id));
  expect(copia.completed_at).toBeNull();
});

it('el peso se escribe en lb y se guarda en kg', () => {
  const s = setSegmentField(newSet('ex1', 1, null, 'lb'), 0, 'weight_kg', 225, 'lb');
  expect(s.segments[0]).toMatchObject({ weight_kg: 102.06, input_unit: 'lb' });
  expect(segmentFieldValue(s.segments[0], 'weight_kg', 'lb')).toBe(225);
});

it('parciales aparte: 10 + 4p', () => {
  const s = setSegmentField(setSegmentField(setSegmentField(newSet('ex1', 1, null, 'kg'), 0, 'weight_kg', 20, 'kg'), 0, 'reps', 10, 'kg'), 0, 'partial_reps', 4, 'kg');
  expect(formatSet(s, 'kg')).toBe('20 × 10 + 4p');
});

it('unilateral: desbalance de 2 o más se señala', () => {
  const s = setSegmentField(setSegmentField(newSet('ex1', 1, null, 'kg'), 0, 'reps_left', 10, 'kg'), 0, 'reps_right', 7, 'kg');
  expect(isImbalanced(s.segments[0])).toBe(true);
  expect(formatSet(s, 'kg')).toBe('I 10 / D 7 reps');
});

it('columnas según lo que mide el ejercicio', () => {
  expect(columnsFor('weight_reps', false)).toEqual(['weight_kg', 'reps']);
  expect(columnsFor('weight_reps', true)).toEqual(['weight_kg', 'reps_left', 'reps_right']);
  expect(columnsFor('bodyweight_reps', false)).toEqual(['reps']);
  expect(columnsFor('duration', false)).toEqual(['duration_sec']);
  expect(columnsFor('distance_duration', false)).toEqual(['distance_m', 'duration_sec']);
});

it('orden entre vecinos', () => {
  expect(sortOrderBetween(1, 2)).toBe(1.5);
  expect(sortOrderBetween(null, 1)).toBe(0);
  expect(sortOrderBetween(3, null)).toBe(4);
});
