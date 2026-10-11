/**
 * Intensificadores, protocolos y edición de series (spec 07 v2, RF-F39, RF-F44 – RF-F48). "La fila
 * se transforma sola": cada intensificador deja la serie con la estructura que le toca, y quitarlo
 * la devuelve como estaba.
 */
import { INTENSIFIERS, PROTOCOLS, type IntensifierKey, type ProtocolKey } from '@/constants/intensifiers';
import { applyOutbox, type OutboxEntry } from '@/lib/gym/outbox';
import { mergeSets, splitSet } from '@/lib/gym/sets';
import { applyIntensifier, protocolPreview, protocolRestSec, protocolSets, protocolTimer, removeIntensifier, unusualCombination } from '@/lib/gym/transforms';
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
    five_by_five: 5, five_three_one: 3, double_pyramid: 6, ramp_to_max: 5, top_backoff: 4, e2mom: 6, death_by: 10,
    hundred_reps: 4, descending_ladder: 10, custom_intervals: 6,
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

/** Protocolos ajustables (T303): cada parámetro cambia lo que se genera, dentro de su rango. */
describe('protocolos con parámetros (T303)', () => {
  const reps = (sets: ReturnType<typeof protocolSets>) => sets.map((s) => s.target?.reps_min);
  const kg = (sets: ReturnType<typeof protocolSets>) => sets.map((s) => s.segments[0]?.weight_kg);

  it('sin parámetros, los 14 de siempre generan lo mismo que antes', () => {
    expect(reps(protocolSets('pyramid', 'we', 1, 100, 'kg'))).toEqual([12, 10, 8, 6]);
    expect(kg(protocolSets('pyramid', 'we', 1, 100, 'kg'))).toEqual([80, 87.5, 92.5, 100]);
    expect(kg(protocolSets('reverse_pyramid', 'we', 1, 100, 'kg'))).toEqual([100, 90, 80]);
    expect(protocolTimer('tabata')).toEqual({ workSec: 20, restSec: 10, rounds: 8 });
    expect(protocolRestSec('gvt')).toBe(75);
  });

  it('series rectas: número de series y rango de reps', () => {
    const s = protocolSets('straight_sets', 'we', 1, 60, 'kg', { sets: 5, repsMin: 6, repsMax: 8 });
    expect(s).toHaveLength(5);
    expect(s[0]?.target).toEqual(expect.objectContaining({ reps_min: 6, reps_max: 8 }));
  });

  it('un valor fuera de rango se lleva al límite, y uno inválido vuelve al de siempre', () => {
    expect(protocolSets('five_by_five', 'we', 1, 100, 'kg', { sets: 50 })).toHaveLength(8);
    expect(protocolSets('five_by_five', 'we', 1, 100, 'kg', { sets: Number.NaN })).toHaveLength(5);
  });

  it('5/3/1: porcentajes de cada semana sobre el máximo de entrenamiento; la última es AMRAP', () => {
    const s1 = protocolSets('five_three_one', 'we', 1, 100, 'kg', { week: 1 });
    expect(kg(s1)).toEqual([65, 75, 85]);
    expect(reps(s1)).toEqual([5, 5, 5]);
    expect(s1.at(-1)?.set_type).toBe('amrap');
    expect(kg(protocolSets('five_three_one', 'we', 1, 100, 'kg', { week: 3 }))).toEqual([75, 85, 95]);
    expect(reps(protocolSets('five_three_one', 'we', 1, 100, 'kg', { week: 3 }))).toEqual([5, 3, 1]);
  });

  it('pirámide doble sube y baja; rampa al máximo termina en serie top', () => {
    expect(reps(protocolSets('double_pyramid', 'we', 1, 100, 'kg'))).toEqual([12, 10, 8, 8, 10, 12]);
    const rampa = protocolSets('ramp_to_max', 'we', 1, 100, 'kg');
    expect(reps(rampa)).toEqual([5, 4, 3, 2, 1]);
    expect(kg(rampa)).toEqual([60, 70, 80, 90, 100]);
    expect(rampa.at(-1)?.set_type).toBe('top_set');
  });

  it('serie top + back-offs: la top y luego las ligeras con el % elegido', () => {
    const s = protocolSets('top_backoff', 'we', 1, 100, 'kg', { sets: 2, dropPercent: 20 });
    expect(s.map((x) => x.set_type)).toEqual(['top_set', 'backoff', 'backoff']);
    expect(kg(s)).toEqual([100, 80, 80]);
  });

  it('100 reps reparte en series de 25; escalera descendente baja hasta 1; death by sube cada minuto', () => {
    expect(reps(protocolSets('hundred_reps', 'we', 1, null, 'kg', { total: 90 }))).toEqual([25, 25, 25, 15]);
    expect(reps(protocolSets('descending_ladder', 'we', 1, null, 'kg', { steps: 5 }))).toEqual([5, 4, 3, 2, 1]);
    expect(reps(protocolSets('death_by', 'we', 1, null, 'kg', { minutes: 5 }))).toEqual([1, 2, 3, 4, 5]);
  });

  it('el timer y el descanso salen de los parámetros', () => {
    expect(protocolTimer('custom_intervals', { rounds: 4, workSec: 45, restSec: 15 })).toEqual({ workSec: 45, restSec: 15, rounds: 4 });
    expect(protocolRestSec('custom_intervals', { restSec: 30 })).toBe(30);
    expect(protocolTimer('e2mom', { rounds: 8 })).toEqual({ workSec: 120, restSec: 0, rounds: 8 });
    expect(protocolTimer('emom', { minutes: 12 })).toEqual({ workSec: 60, restSec: 0, rounds: 12 });
  });

  it('vista previa corta de cada protocolo', () => {
    expect(protocolPreview('pyramid')).toBe('12 · 10 · 8 · 6');
    expect(protocolPreview('five_by_five')).toBe('5 × 5');
    expect(protocolPreview('straight_sets')).toBe('3 × 8–12');
    expect(protocolPreview('tabata')).toBe('8 × 20 s / 10 s');
    expect(protocolPreview('emom')).toBe('10 × 1 min');
    expect(protocolPreview('amrap_time')).toBe('10 min');
    expect(protocolPreview('descending_ladder')).toBe('10 · 9 · 8 … 1');
  });

  it('cada protocolo pertenece a un objetivo y sus valores por omisión están en su rango', () => {
    for (const p of PROTOCOLS) {
      expect(['strength', 'hypertrophy', 'endurance', 'timed']).toContain(p.goal);
      for (const d of p.params) expect(d.default >= d.min && d.default <= d.max).toBe(true);
      expect(p.timer).toBe(p.goal === 'timed');
    }
  });
});
