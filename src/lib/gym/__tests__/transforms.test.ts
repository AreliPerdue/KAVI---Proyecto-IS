/**
 * Intensificadores, protocolos y edición de series (spec 07 v2, RF-F39, RF-F44 – RF-F48). "La fila
 * se transforma sola": cada intensificador deja la serie con la estructura que le toca, y quitarlo
 * la devuelve como estaba.
 */
import { INTENSIFIERS, PROTOCOLS, type IntensifierKey, type ProtocolKey } from '@/constants/intensifiers';
import { applyOutbox, type OutboxEntry } from '@/lib/gym/outbox';
import { mergeSets, splitSet } from '@/lib/gym/sets';
import { applyIntensifier, protocolRestSec, protocolSets, protocolTimer, removeIntensifier, unusualCombination } from '@/lib/gym/transforms';
import { suggestVariants } from '@/lib/gym/variants';

import { delCatalogo, ejercicio, seg, serie } from './fixtures';

const OPC = { dropPercent: 20 };
const base = () => serie(100, 10);

describe('applyIntensifier (RF-F44)', () => {
  it.each(INTENSIFIERS.map((i) => i.key))('%s queda marcado en la serie y no rompe el tramo principal', (key) => {
    const s = applyIntensifier(base(), key, OPC);
    expect(s.intensifiers).toContain(key);
    expect(s.segments.length).toBeGreaterThanOrEqual(1);
    expect(s.segments.map((g) => g.sort_order)).toEqual(s.segments.map((_, i) => i));
  });

  it('aplicar dos veces no lo duplica en la lista', () => {
    const s = applyIntensifier(applyIntensifier(base(), 'tempo', OPC), 'tempo', OPC);
    expect(s.intensifiers.filter((k) => k === 'tempo')).toHaveLength(1);
  });

  it('drop set: un tramo más, 20 % más ligero y sin descanso', () => {
    const s = applyIntensifier(base(), 'drop_set', OPC);
    expect(s.segments.map((g) => [g.kind, g.weight_kg, g.rest_before_sec])).toEqual([
      ['main', 100, null],
      ['drop', 80, 0],
    ]);
  });

  it('drop mecánico: mismo peso, la variante se elige en el tramo', () => {
    const s = applyIntensifier(base(), 'mechanical_drop', OPC);
    expect(s.segments[1]).toMatchObject({ kind: 'drop', weight_kg: 100 });
  });

  it('rest-pause: dos mini-tramos con 15 s', () => {
    const s = applyIntensifier(base(), 'rest_pause', OPC);
    expect(s.segments.slice(1).map((g) => [g.kind, g.rest_before_sec])).toEqual([
      ['rest_pause', 15],
      ['rest_pause', 15],
    ]);
  });

  it('myo-reps: activación y tres mini-series', () => {
    expect(applyIntensifier(base(), 'myo_reps', OPC).segments.map((g) => g.kind)).toEqual(['myo_activation', 'myo_mini', 'myo_mini', 'myo_mini']);
  });

  it('21s: 7 abajo, 7 arriba, 7 completas', () => {
    expect(applyIntensifier(base(), 'twenty_ones', OPC).segments.map((g) => [g.kind, g.reps])).toEqual([
      ['twenty_ones_bottom', 7],
      ['twenty_ones_top', 7],
      ['twenty_ones_full', 7],
    ]);
  });

  it('BFR: 30-15-15-15 con 30 s entre tramos', () => {
    const s = applyIntensifier(base(), 'bfr', OPC);
    expect(s.segments.map((g) => g.reps)).toEqual([30, 15, 15, 15]);
    expect(s.segments.map((g) => g.rest_before_sec)).toEqual([null, 30, 30, 30]);
  });

  it('cluster: cuatro bloques que reparten las reps', () => {
    expect(applyIntensifier(base(), 'cluster', OPC).segments.map((g) => g.reps)).toEqual([3, 3, 3, 3]);
  });

  it('tempo y superlento ponen su tempo; los que solo se anotan no crean tramos', () => {
    expect(applyIntensifier(base(), 'tempo', OPC).tempo).toBe('3-1-X-0');
    expect(applyIntensifier(base(), 'super_slow', OPC).tempo).toBe('10-0-10-0');
    expect(applyIntensifier(base(), 'forced_reps', OPC).segments).toHaveLength(1);
  });
});

describe('removeIntensifier', () => {
  it.each(['drop_set', 'rest_pause', 'myo_reps', 'twenty_ones', 'bfr', 'negatives', 'iso_hold'] as IntensifierKey[])(
    'quitar %s devuelve la serie a un solo tramo principal',
    (key) => {
      const s = removeIntensifier(applyIntensifier(base(), key, OPC), key);
      expect(s.intensifiers).not.toContain(key);
      expect(s.segments[0]?.kind).toBe('main');
      expect(s.segments.filter((g) => g.kind !== 'main' && g.kind !== 'bfr' && g.kind !== 'twenty_ones_bottom')).toEqual([]);
    },
  );

  it('solo quita los tramos que trajo ese intensificador', () => {
    const conDos = applyIntensifier(applyIntensifier(base(), 'drop_set', OPC), 'negatives', OPC);
    const sinDrop = removeIntensifier(conDos, 'drop_set');
    expect(sinDrop.segments.map((g) => g.kind)).toEqual(['main', 'negative']);
  });

  it('quitar el tempo lo borra', () => {
    expect(removeIntensifier(applyIntensifier(base(), 'tempo', OPC), 'tempo').tempo).toBeNull();
  });
});

describe('combinaciones raras (RF-F48): se avisa, nunca se bloquea', () => {
  it('una serie normal no avisa', () => {
    expect(unusualCombination(base())).toBeNull();
  });

  it.each([
    ['calentamiento al fallo', serie(40, 10, { set_type: 'warmup', failure: 'muscular' }), /Calentamiento/],
    ['superlento con esfuerzo dinámico', serie(40, 10, { intensifiers: ['super_slow', 'dynamic_effort'] }), /Superlento/],
    ['test de máximo con intensificador', serie(140, 1, { set_type: 'max_test', intensifiers: ['tempo'] }), /test de máximo/],
    ['fallo con RIR mayor que 0', serie(100, 8, { failure: 'muscular', rir: 2 }), /RIR mayor que 0/],
  ])('%s', (_n, s, texto) => {
    expect(unusualCombination(s, 'es')).toMatch(texto);
  });

  it('en inglés también (spec 12)', () => {
    expect(unusualCombination(serie(100, 8, { failure: 'muscular', rir: 2 }), 'en')).toBe('You marked failure and an RIR above 0.');
  });
});

describe('protocolos (RF-F46)', () => {
  const esperado: Record<ProtocolKey, number> = {
    straight_sets: 3, pyramid: 4, reverse_pyramid: 3, wave_loading: 6, ladder: 5, emom: 10, amrap_time: 1, tabata: 8,
    density: 1, fst7: 7, gvt: 10, widowmaker: 1, heavy_light: 2, hit: 1,
  };

  it.each(PROTOCOLS.map((p) => p.key))('%s genera sus series en orden', (key) => {
    const sets = protocolSets(key, 'we', 10, 100, 'kg');
    expect(sets).toHaveLength(esperado[key]);
    expect(sets.map((s) => s.sort_order)).toEqual(sets.map((_, i) => 10 + i));
    expect(sets.every((s) => s.workout_exercise_id === 'we' && s.completed_at === null)).toBe(true);
  });

  it('los pesos relativos se redondean a lo que se puede cargar (2.5 kg)', () => {
    const pesos = protocolSets('pyramid', 'we', 1, 100, 'kg').map((s) => s.segments[0]?.weight_kg);
    expect(pesos).toEqual([80, 87.5, 92.5, 100]);
    expect(pesos.every((p) => (p as number) % 2.5 === 0)).toBe(true);
  });

  it('sin peso de trabajo no inventa pesos', () => {
    expect(protocolSets('pyramid', 'we', 1, null, 'kg').every((s) => s.segments[0]?.weight_kg === null)).toBe(true);
  });

  it('RPT: la primera es top set y las demás back-off', () => {
    expect(protocolSets('reverse_pyramid', 'we', 1, 100, 'kg').map((s) => s.set_type)).toEqual(['top_set', 'backoff', 'backoff']);
  });

  it('timers y descansos de los que los usan', () => {
    expect(protocolTimer('tabata')).toEqual({ workSec: 20, restSec: 10, rounds: 8 });
    expect(protocolTimer('emom')).toEqual({ workSec: 60, restSec: 0, rounds: 10 });
    expect(protocolTimer('pyramid')).toBeNull();
    expect(protocolRestSec('gvt')).toBe(75);
    expect(protocolRestSec('pyramid')).toBeNull();
  });
});

describe('separar y unir series (RF-F39)', () => {
  it('separar: cada tramo extra es su propia serie, después de la original y antes de la siguiente', () => {
    const conDrop = applyIntensifier(serie(100, 10, { sort_order: 1 }), 'drop_set', OPC);
    const [original, nueva] = splitSet(conDrop, 2);
    expect(original?.id).toBe(conDrop.id);
    expect(original?.intensifiers).not.toContain('drop_set');
    expect(nueva?.id).not.toBe(conDrop.id);
    expect(nueva?.segments[0]).toMatchObject({ kind: 'main', weight_kg: 80, set_id: nueva?.id });
    expect(nueva!.sort_order).toBeGreaterThan(1);
    expect(nueva!.sort_order).toBeLessThan(2);
  });

  it('una serie de un solo tramo no se separa', () => {
    const s = base();
    expect(splitSet(s, null)).toEqual([s]);
  });

  it('unir como drop: los tramos de la segunda pasan a la primera sin descanso', () => {
    const a = serie(100, 8, { completed_at: null });
    const b = serie(80, 6);
    const unida = mergeSets(a, b, 'drop');
    expect(unida.id).toBe(a.id);
    expect(unida.intensifiers).toContain('drop_set');
    expect(unida.segments.map((g) => [g.kind, g.weight_kg, g.set_id])).toEqual([
      ['main', 100, a.id],
      ['drop', 80, a.id],
    ]);
    // Si cualquiera estaba hecha, la unida también.
    expect(unida.completed_at).toBe(b.completed_at);
  });

  it('unir como rest-pause pone 15 s si no había descanso anotado', () => {
    expect(mergeSets(base(), base(), 'rest_pause').segments[1]?.rest_before_sec).toBe(15);
  });
});

describe('cola de series (RF-F17, RF-F39)', () => {
  it('una serie movida a otro ejercicio sale de uno y aparece en el otro', () => {
    const s = serie(60, 10, { workout_exercise_id: 'e1' });
    const detalle = { id: 'w1', exercises: [ejercicio('banca', [s], { id: 'e1' }), ejercicio('curl', [], { id: 'e2' })] };
    const movida = { ...s, workout_exercise_id: 'e2' };
    const r = applyOutbox(detalle, [{ op: 'save', workoutId: 'w1', set: movida, at: 1 } as OutboxEntry]);
    expect(r.exercises[0]?.workout_sets).toEqual([]);
    expect(r.exercises[1]?.workout_sets.map((x) => x.id)).toEqual([s.id]);
  });

  it('lo de otra sesión no se mezcla', () => {
    const detalle = { id: 'w1', exercises: [ejercicio('banca', [base()], { id: 'e1' })] };
    expect(applyOutbox(detalle, [{ op: 'remove', workoutId: 'w2', setId: 'x', at: 1 } as OutboxEntry])).toBe(detalle);
  });
});

describe('variantes del drop mecánico (RF-F44)', () => {
  const banca = delCatalogo('banca', { slug: 'banca', primary_muscles: ['chest_mid'], equipment: ['barbell'], mechanic: 'compound', movement_pattern: 'horizontal_push' });
  const inclinado = delCatalogo('inclinado', { slug: 'inclinado', primary_muscles: ['chest_upper'], equipment: ['barbell'], mechanic: 'compound', movement_pattern: 'incline_push' });
  const aperturas = delCatalogo('aperturas', { slug: 'aperturas', primary_muscles: ['chest_mid'], equipment: ['dumbbell'], mechanic: 'isolation', movement_pattern: 'fly' });
  const sentadilla = delCatalogo('sentadilla', { slug: 'sentadilla', primary_muscles: ['quads'], equipment: ['barbell'], mechanic: 'compound' });
  const fondos = delCatalogo('fondos', { slug: 'fondos', primary_muscles: ['chest_lower'], equipment: ['bodyweight'], mechanic: 'compound', movement_pattern: 'dip' });

  it('mismo grupo y mecánica, con equipo o patrón en común', () => {
    const ids = suggestVariants(banca, [banca, inclinado, aperturas, sentadilla, fondos]).map((e) => e.id);
    expect(ids).toEqual(['inclinado']);
  });

  it('los archivados no se sugieren', () => {
    expect(suggestVariants(banca, [{ ...inclinado, archived_at: 'x' }])).toEqual([]);
  });
});

it('fixtures: un tramo nuevo nace vacío', () => {
  expect(seg()).toMatchObject({ kind: 'main', weight_kg: null, reps: null });
});
