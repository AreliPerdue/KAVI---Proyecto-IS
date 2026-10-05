/** Presets y textos de recordatorios (RF-C9). */
import { describeOffset, REMINDER_HORIZON_DAYS, REMINDER_PRESETS } from '@/constants/reminders';

describe('presets', () => {
  it('van de menor a mayor antelacion', () => {
    const offsets = REMINDER_PRESETS.map((p) => p.offset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it('el horizonte coincide con el de la recurrencia', () => {
    expect(REMINDER_HORIZON_DAYS).toBe(90);
  });
});

describe('describeOffset', () => {
  it.each([
    [0, 'Al momento'],
    [10, '10 min antes'],
    [30, '30 min antes'],
    [60, '1 h antes'],
    [1440, '1 día antes'],
  ])(
    'usa la etiqueta del preset para %p',
    (offset, label) => {
      expect(describeOffset(offset as number)).toBe(label);
    },
  );

  it('expresa en dias los multiplos de 1440', () => {
    expect(describeOffset(2880)).toBe('2 días antes');
  });

  it('expresa en horas los multiplos de 60', () => {
    expect(describeOffset(120)).toBe('2 h antes');
  });

  it('cae a minutos cuando no es multiplo', () => {
    expect(describeOffset(45)).toBe('45 min antes');
  });

  it('nunca devuelve vacio', () => {
    for (const o of [0, 1, 45, 60, 1440, 5000]) expect(describeOffset(o).length).toBeGreaterThan(0);
  });
});
