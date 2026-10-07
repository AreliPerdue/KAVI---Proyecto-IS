/**
 * Lo que comparten el logger y el borrador de la actividad tras extraer `set-editing.ts`
 * (RF-F28): el teclado de cada celda, cómo se escribe lo tecleado y el orden de "Siguiente".
 */
import { applyNumpadValue, nextNumpadTarget, numpadFieldFor } from '@/components/fitness/set-editing';
import { newSet, segmentFieldValue, setSegmentField } from '@/lib/gym/sets';

const base = () => setSegmentField(setSegmentField(newSet('e1', 1, null, 'kg'), 0, 'weight_kg', 100, 'kg'), 0, 'reps', 8, 'kg');
const peso = { setId: 's', segmentIndex: 0, field: 'weight_kg' as const };
const reps = { setId: 's', segmentIndex: 0, field: 'reps' as const };
const esfuerzo = { setId: 's', segmentIndex: 0, field: 'effort' as const };

describe('numpadFieldFor', () => {
  it('peso en kg: pasos de 2.5 con decimales; en lb, de 5 y el valor convertido', () => {
    expect(numpadFieldFor(peso, base(), 'Banca · serie 1', 'rir', 'kg', 'es')).toEqual(expect.objectContaining({ value: 100, step: 2.5, decimals: true, suffix: 'kg', title: 'Banca · serie 1 · Peso' }));
    const lb = numpadFieldFor(peso, base(), 'x', 'rir', 'lb', 'es');
    expect(lb.step).toBe(5);
    expect(lb.suffix).toBe('lb');
    expect(lb.value as number).toBeCloseTo(220.46, 0);
  });

  it('reps: contador entero hasta 999', () => {
    expect(numpadFieldFor(reps, base(), 'x', 'rir', 'kg', 'es')).toEqual(expect.objectContaining({ value: 8, step: 1, decimals: false, counter: true, max: 999 }));
  });

  it('esfuerzo según la escala: RIR entero de 0 a 10; RPE de medio en medio desde 1', () => {
    expect(numpadFieldFor(esfuerzo, { ...base(), rir: 2 }, 'x', 'rir', 'kg', 'es')).toEqual(expect.objectContaining({ title: 'x · RIR', value: 2, step: 1, decimals: false, min: 0, max: 10 }));
    expect(numpadFieldFor(esfuerzo, { ...base(), rpe: 8.5 }, 'x', 'rpe', 'kg', 'es')).toEqual(expect.objectContaining({ title: 'x · RPE', value: 8.5, step: 0.5, decimals: true, min: 1 }));
  });

  it('el título sale del idioma activo', () => {
    expect(numpadFieldFor(peso, base(), 'Bench · set 1', 'rir', 'kg', 'en').title).toBe('Bench · set 1 · Weight');
  });
});

describe('applyNumpadValue', () => {
  it('el esfuerzo va a rir o rpe según la escala, no a un tramo', () => {
    expect(applyNumpadValue(base(), esfuerzo, 1, 'rir', 'kg').rir).toBe(1);
    expect(applyNumpadValue(base(), esfuerzo, 9, 'rpe', 'kg').rpe).toBe(9);
  });

  it('un peso tecleado en lb se guarda en kg', () => {
    const s = applyNumpadValue(base(), peso, 225, 'rir', 'lb');
    expect(s.segments[0]?.weight_kg).toBeCloseTo(102.06, 1);
    expect(segmentFieldValue(s.segments[0]!, 'weight_kg', 'lb')).toBeCloseTo(225, 0);
  });

  it('vaciar un campo lo deja en null', () => {
    expect(applyNumpadValue(base(), reps, null, 'rir', 'kg').segments[0]?.reps).toBeNull();
  });
});

describe('nextNumpadTarget ("Siguiente")', () => {
  const columnas = ['weight_kg', 'reps'] as const;
  it('peso → reps → esfuerzo → cierra', () => {
    expect(nextNumpadTarget(peso, columnas)).toEqual(reps);
    expect(nextNumpadTarget(reps, columnas)).toEqual(esfuerzo);
    expect(nextNumpadTarget(esfuerzo, columnas)).toBeNull();
  });

  it('en un tramo extra (drop) no avanza: cierra', () => {
    expect(nextNumpadTarget({ ...peso, segmentIndex: 1 }, columnas)).toBeNull();
  });

  it('un campo que no es columna de este ejercicio cierra', () => {
    expect(nextNumpadTarget({ ...peso, field: 'distance_m' }, columnas)).toBeNull();
  });
});
