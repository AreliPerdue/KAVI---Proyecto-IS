/** Herramientas del logger (RF-F29, RF-F35, RF-F44). */
import { nextDropWeight, oneRmTable, platesPerSide, PLATES, shouldIncreaseWeight, warmupRamp } from '@/lib/gym/tools';

describe('calculadora de discos', () => {
  it('100 kg con barra de 20: 25 + 15 por lado', () => {
    expect(platesPerSide(100, 20, PLATES.kg)).toEqual({ perSide: [25, 15], achieved: 100, remainder: 0 });
  });
  it('142.5 kg usa el 1.25', () => {
    expect(platesPerSide(142.5, 20, PLATES.kg).perSide).toEqual([25, 25, 10, 1.25]);
  });
  it('si no es exacto se queda corto y dice cuánto falta', () => {
    const r = platesPerSide(82.3, 20, PLATES.kg);
    expect(r.achieved).toBe(82.5 - 2.5);
    expect(r.remainder).toBeCloseTo(2.3, 5);
  });
  it('libras: 225 = dos de 45 por lado', () => {
    expect(platesPerSide(225, 45, PLATES.lb).perSide).toEqual([45, 45]);
  });
  it('menos que la barra: nada que poner', () => {
    expect(platesPerSide(15, 20, PLATES.kg).perSide).toEqual([]);
  });
});

describe('rampa de calentamiento', () => {
  it('hacia 140 kg: barra, 40/60/80 % redondeado', () => {
    expect(warmupRamp(140, 20)).toEqual([
      { weight: 20, reps: 10 },
      { weight: 55, reps: 5 },
      { weight: 85, reps: 3 },
      { weight: 112.5, reps: 2 },
    ]);
  });
  it('siempre sube y nunca llega al top set', () => {
    const r = warmupRamp(60, 20);
    for (let i = 1; i < r.length; i++) expect(r[i].weight).toBeGreaterThan(r[i - 1].weight);
    expect(r.every((p) => p.weight < 60)).toBe(true);
  });
  it('si el top set no pasa de la barra no hay rampa', () => {
    expect(warmupRamp(20, 20)).toEqual([]);
  });
});

describe('1RM', () => {
  it('100 × 5 con Epley ≈ 116.7 y la tabla parte de ahí', () => {
    const t = oneRmTable(100, 5, 'epley');
    expect(t?.e1rm).toBe(116.7);
    expect(t?.rows[0]).toEqual({ pct: 100, weight: 116.7 });
    expect(t?.rows.find((r) => r.pct === 80)?.weight).toBe(93.3);
  });
  it('sin datos no hay tabla', () => {
    expect(oneRmTable(0, 5, 'epley')).toBeNull();
  });
});

describe('progresión y drops', () => {
  it('13 reps con un plan de 8–12: toca subir', () => {
    expect(shouldIncreaseWeight({ reps_min: 8, reps_max: 12 }, 13)).toBe(true);
    expect(shouldIncreaseWeight({ reps_min: 8, reps_max: 12 }, 12)).toBe(false);
    expect(shouldIncreaseWeight(null, 20)).toBe(false);
  });
  it('el drop baja 20 % y redondea a lo que se puede cargar', () => {
    expect(nextDropWeight(100, 20)).toBe(80);
    expect(nextDropWeight(62.5, 20)).toBe(50);
    expect(nextDropWeight(null, 20)).toBeNull();
  });
});
