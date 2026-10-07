/**
 * Modo Gymrat (spec 07 v2, §8): el humor vive en `constants/gymrat.ts`, se apaga con Modo serio
 * y desde T196b tiene versión en inglés con "king/queen".
 */
import { gymratLine, gymratLineFor, streakReasonLabel, tonnageEquivalence } from '@/constants/gymrat';

describe('frases', () => {
  it('en Modo serio no hay frase', () => {
    expect(gymratLine('pr', 'rey', true)).toBeNull();
    expect(gymratLineFor('leg_day', 'reina', true, 'x')).toBeNull();
  });

  it('nunca repite la misma frase dos veces seguidas', () => {
    const azar = jest.spyOn(Math, 'random').mockReturnValue(0);
    const primera = gymratLine('drop', 'neutral', false, 'es');
    const segunda = gymratLine('drop', 'neutral', false, 'es');
    expect(segunda).not.toBe(primera);
    azar.mockRestore();
  });

  it('el vocativo sigue el trato y el idioma', () => {
    const azar = jest.spyOn(Math, 'random').mockReturnValue(0);
    // La primera frase de PR lleva {voc}.
    expect(gymratLine('pr', 'rey', false, 'es')).toContain(', mi rey');
    expect(gymratLine('session_done', 'reina', false, 'es')).toContain(', mi reina');
    expect(gymratLine('rest_end', 'rey', false, 'en')).not.toContain('mi rey');
    azar.mockRestore();
  });

  it('en inglés, rey y reina son "king" y "queen"; neutral no lleva vocativo', () => {
    const todas = (trato: 'rey' | 'reina' | 'neutral') =>
      Array.from({ length: 40 }, (_, i) => gymratLineFor('pr', trato, false, `semilla-${i}`, 'en')).join(' ');
    expect(todas('rey')).toMatch(/\bking\b/);
    expect(todas('reina')).toMatch(/\bqueen\b/);
    expect(todas('neutral')).not.toMatch(/\b(king|queen|rey|reina)\b/);
  });

  it('con la misma semilla, la misma frase (el resumen no cambia en cada render)', () => {
    expect(gymratLineFor('session_done', 'neutral', false, 'w1', 'es')).toBe(gymratLineFor('session_done', 'neutral', false, 'w1', 'es'));
  });

  it('las variantes por trato cambian la gramática, no solo el vocativo', () => {
    const frases = (trato: 'rey' | 'reina') =>
      new Set(Array.from({ length: 30 }, (_, i) => gymratLineFor('no_legs', trato, false, `s${i}`, 'es')));
    expect([...frases('rey')].join(' ')).toMatch(/Bro/);
    expect([...frases('reina')].join(' ')).toMatch(/Amiga/);
  });
});

describe('equivalencia de tonelaje (RF-F59)', () => {
  it('menos de 140 kg no tiene equivalencia', () => {
    expect(tonnageEquivalence(100, 'x', 'es')).toBeNull();
  });

  it('elige algo que cabe entre 2 y 30 veces, en el idioma de la app', () => {
    const es = tonnageEquivalence(12_000, 'w1', 'es');
    const en = tonnageEquivalence(12_000, 'w1', 'en');
    expect(es).toMatch(/^\d+([.,]\d)? \S/);
    expect(en).toMatch(/^\d+([.,]\d)? \S/);
    expect(es).not.toEqual(en);
  });

  it('sin nada que quepa de 2 a 30 veces, usa lo más grande que quepa al menos una vez', () => {
    // 5,000,000 kg: la ballena (150,000) cabe 33 veces; nada cabe de 2 a 30, así que se usa la ballena.
    expect(tonnageEquivalence(5_000_000, 'x', 'es')).toMatch(/ballenas azules$/);
  });
});

describe('motivos de la pausa', () => {
  it('"Ocupado/Ocupada" sigue el trato en español; en inglés siempre "Busy"', () => {
    expect(streakReasonLabel('busy', 'rey', 'es')).toBe('Ocupado');
    expect(streakReasonLabel('busy', 'reina', 'es')).toBe('Ocupada');
    expect(streakReasonLabel('busy', 'neutral', 'es')).toBe('Sin tiempo');
    expect(streakReasonLabel('busy', 'reina', 'en')).toBe('Busy');
  });

  it('cada motivo en inglés, y lo desconocido como "Other"', () => {
    expect(['sick', 'travel', 'planned_rest', 'otro'].map((r) => streakReasonLabel(r, 'neutral', 'en'))).toEqual([
      'Sick',
      'Travel',
      'Planned rest',
      'Other',
    ]);
  });
});
