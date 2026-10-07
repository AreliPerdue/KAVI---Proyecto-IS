/**
 * Conversión del texto libre de v1 (RF-F62). La regla: convertir lo inequívoco y no
 * adivinar lo ambiguo. Cada caso de aquí es una forma real en que se capturaba en v1.
 */
import { hasLegacyText, legacySetsFor, MAX_LEGACY_SETS, parseLegacy, type LegacyInput } from '@/lib/gym/legacy';

const ej = (over: Partial<LegacyInput>): LegacyInput => ({ sets: null, reps: null, weight: null, duration_minutes: null, ...over });

describe('parseLegacy', () => {
  it('4 series, "8/8/6/6", "80 kg" → cuatro series de 80 kg', () => {
    const p = parseLegacy(ej({ sets: 4, reps: '8/8/6/6', weight: '80 kg' }));
    expect(p.ambiguous).toBe(false);
    expect(p.sets.map((s) => s.reps)).toEqual([8, 8, 6, 6]);
    expect(p.sets.every((s) => s.weight_kg === 80)).toBe(true);
  });

  it('3 series de "12" → tres series de 12', () => {
    const p = parseLegacy(ej({ sets: 3, reps: '12', weight: '160 kg' }));
    expect(p.sets).toHaveLength(3);
    expect(p.sets.every((s) => s.reps === 12 && s.weight_kg === 160)).toBe(true);
  });

  it('"3x12" sin número de series → tres de 12', () => {
    const p = parseLegacy(ej({ reps: '3x12', weight: '20' }));
    expect(p.sets).toHaveLength(3);
    expect(p.sets[0]).toMatchObject({ reps: 12, weight_kg: 20, input_unit: 'kg' });
  });

  it('"al fallo" → series de tipo fallo sin reps', () => {
    const p = parseLegacy(ej({ sets: 2, reps: 'al fallo' }));
    expect(p.sets).toHaveLength(2);
    expect(p.sets.every((s) => s.set_type === 'failure' && s.reps === null)).toBe(true);
  });

  it('"corporal" marca el ejercicio como de peso corporal', () => {
    const p = parseLegacy(ej({ sets: 3, reps: '10', weight: 'Peso corporal' }));
    expect(p.bodyweight).toBe(true);
    expect(p.sets.every((s) => s.weight_kg === null)).toBe(true);
    expect(p.ambiguous).toBe(false);
  });

  it('libras se guardan en kg recordando la unidad', () => {
    const p = parseLegacy(ej({ sets: 1, reps: '5', weight: '225 lb' }));
    expect(p.sets[0]).toMatchObject({ weight_kg: 102.06, input_unit: 'lb' });
  });

  it('un peso por serie: "80/80/70 kg"', () => {
    const p = parseLegacy(ej({ reps: '8/8/6', weight: '80/80/70 kg' }));
    expect(p.sets.map((s) => s.weight_kg)).toEqual([80, 80, 70]);
  });

  it('criterio de la spec: "12/10/8" con "40kg + cadena" → tres series, peso sin adivinar', () => {
    const p = parseLegacy(ej({ reps: '12/10/8', weight: '40kg + cadena' }));
    expect(p.sets.map((s) => s.reps)).toEqual([12, 10, 8]);
    expect(p.sets.every((s) => s.weight_kg === null)).toBe(true);
    expect(p.ambiguous).toBe(true);
    expect(p.reasons.join(' ')).toContain('40kg + cadena');
  });

  it('"25 lb por lado" es ambiguo: no se adivina el total', () => {
    const p = parseLegacy(ej({ sets: 3, reps: '10', weight: '25 lb por lado' }));
    expect(p.ambiguous).toBe(true);
    expect(p.sets.every((s) => s.weight_kg === null && s.reps === 10)).toBe(true);
  });

  it('series que no cuadran con la lista de reps: gana la lista y se avisa', () => {
    const p = parseLegacy(ej({ sets: 4, reps: '12/10/8' }));
    expect(p.sets).toHaveLength(3);
    expect(p.ambiguous).toBe(true);
  });

  it('plancha: una serie con duración se convierte; varias no se reparten', () => {
    expect(parseLegacy(ej({ duration_minutes: 5 })).sets[0]).toMatchObject({ duration_sec: 300 });
    const varias = parseLegacy(ej({ sets: 3, reps: 'al fallo', weight: 'corporal', duration_minutes: 5 }));
    expect(varias.sets.every((s) => s.duration_sec === null)).toBe(true);
    expect(varias.ambiguous).toBe(true);
  });

  it('reps ilegibles: se crean las series sin reps y se avisa', () => {
    const p = parseLegacy(ej({ sets: 2, reps: 'unas cuantas' }));
    expect(p.sets).toHaveLength(2);
    expect(p.ambiguous).toBe(true);
  });

  it('un número absurdo de series no se convierte', () => {
    const p = parseLegacy(ej({ sets: MAX_LEGACY_SETS + 1, reps: '10' }));
    expect(p.sets).toHaveLength(0);
    expect(p.ambiguous).toBe(true);
  });

  it('solo el nombre no tiene nada que convertir', () => {
    expect(hasLegacyText(ej({}))).toBe(false);
    expect(parseLegacy(ej({})).sets).toHaveLength(0);
    expect(hasLegacyText(ej({ reps: '  ' }))).toBe(false);
    expect(hasLegacyText(ej({ sets: 3 }))).toBe(true);
  });
});

describe('legacySetsFor', () => {
  const ejercicio = { id: 'ex-1', ...ej({ sets: 2, reps: '10', weight: '50 kg' }) };

  it('cada serie nace con un segmento main, hecha en la fecha de la sesión', () => {
    const sets = legacySetsFor(ejercicio, '2026-09-20T07:30:00.000Z');
    expect(sets).toHaveLength(2);
    expect(sets.every((s) => s.segments.length === 1 && s.segments[0].kind === 'main')).toBe(true);
    expect(sets.every((s) => s.completed_at === '2026-09-20T07:30:00.000Z' && s.from_legacy)).toBe(true);
  });

  it('convertir dos veces da los mismos ids: idempotente', () => {
    const a = legacySetsFor(ejercicio, '2026-09-20T07:30:00.000Z');
    const b = legacySetsFor(ejercicio, '2026-09-20T07:30:00.000Z');
    expect(b.map((s) => s.id)).toEqual(a.map((s) => s.id));
    expect(b.map((s) => s.segments[0].id)).toEqual(a.map((s) => s.segments[0].id));
  });
});

/**
 * Los motivos de "no se pudo convertir sin adivinar" se leen en la sesión: van en el idioma de la
 * app (spec 12, T196b). Uno por cada regla.
 */
describe('motivos en los dos idiomas', () => {
  const casos: { nombre: string; entrada: LegacyInput; es: RegExp; en: RegExp }[] = [
    { nombre: 'series contra lista de reps', entrada: ej({ sets: 3, reps: '8/8/6/6' }), es: /Decía 3 series pero 4 cantidades de reps/, en: /It said 3 sets but 4 rep counts/ },
    { nombre: 'series contra "NxM"', entrada: ej({ sets: 4, reps: '3x12' }), es: /Decía 4 series y "3x12"/, en: /It said 4 sets and “3x12”/ },
    { nombre: 'reps ilegibles', entrada: ej({ sets: 2, reps: 'unas cuantas' }), es: /No se pudieron leer las reps: "unas cuantas"/, en: /Couldn’t read the reps: “unas cuantas”/ },
    { nombre: 'demasiadas series', entrada: ej({ sets: MAX_LEGACY_SETS + 1, reps: '10' }), es: /parecen un error de captura/, en: /look like a typo/ },
    { nombre: 'pesos contra series', entrada: ej({ sets: 3, reps: '10', weight: '40/50' }), es: /Hay 2 pesos para 3 series/, en: /There are 2 weights for 3 sets/ },
    { nombre: 'peso ilegible', entrada: ej({ sets: 3, reps: '10', weight: 'pesado' }), es: /No se pudo leer el peso: "pesado"/, en: /Couldn’t read the weight: “pesado”/ },
    { nombre: 'duración de todo el ejercicio', entrada: ej({ sets: 3, reps: '10', duration_minutes: 20 }), es: /20 min eran del ejercicio completo/, en: /20 min were for the whole exercise/ },
  ];

  it.each(casos)('$nombre', ({ entrada, es, en }) => {
    expect(parseLegacy(entrada, 'es').reasons.join(' ')).toMatch(es);
    expect(parseLegacy(entrada, 'en').reasons.join(' ')).toMatch(en);
  });
});
