/**
 * Modo daltonismo (spec 05, RF-T7 – RF-T11): qué color toma cada cosa con el modo encendido.
 */
import { DIMENSIONS, dimensionColor } from '@/constants/dimensions';
import { ColorblindColors, Colors } from '@/constants/theme';
import { contrastRatio, textOn } from '@/lib/color';
import { initialOf, themeColor, withSafeColor } from '@/lib/color-vision';

describe('actividades (RF-T8)', () => {
  it('física y emocional se pintan #228833 y #EE6677, sin importar el color de su tema', () => {
    expect(withSafeColor({ dimension: 'fisica', color: '#00FF00' }).color).toBe('#228833');
    expect(withSafeColor({ dimension: 'emocional', color: '#FF00AA' }).color).toBe('#EE6677');
  });

  it('sin dimensión conserva su color o el neutro (RF-T4)', () => {
    expect(withSafeColor({ dimension: null, color: '#123456' }).color).toBe('#123456');
    expect(withSafeColor({ dimension: null, color: null }).color).toBeNull();
  });

  it('no toca el resto de la actividad', () => {
    const a = { id: 'a', title: 'Gym', dimension: 'fisica' as const, color: '#4CAF50' };
    expect(withSafeColor(a)).toEqual({ ...a, color: '#228833' });
  });

  it('los temas se ven con el color de su dimensión solo con el modo encendido', () => {
    const tema = { dimension: 'social' as const, color: '#FF00FF' };
    expect(themeColor(tema, false)).toBe('#FF00FF');
    expect(themeColor(tema, true)).toBe('#CCBB44');
  });

  it('las 7 dimensiones tienen colores distintos en los dos modos', () => {
    for (const modo of [false, true]) expect(new Set(DIMENSIONS.map((d) => dimensionColor(d.key, modo))).size).toBe(7);
  });
});

describe('letra sobre cada color', () => {
  it('se elige por contraste: tinta sobre los claros, blanco sobre los oscuros', () => {
    expect(textOn('#CCBB44')).toBe('#131313');
    expect(textOn('#66CCEE')).toBe('#131313');
    expect(textOn('#BBBBBB')).toBe('#131313');
    expect(textOn('#4477AA')).toBe('#FFFFFF');
    expect(textOn('#AA3377')).toBe('#FFFFFF');
  });

  it('siempre llega a 4.5:1 con los 7 colores', () => {
    for (const d of DIMENSIONS) expect(contrastRatio(d.colorblind, textOn(d.colorblind))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('estados (RF-T9)', () => {
  it('éxito es azul y se lee (≥ 4.5:1) sobre el fondo y las tarjetas de cada esquema', () => {
    for (const s of ['light', 'dark'] as const) {
      const t = ColorblindColors[s];
      expect(t.success).not.toBe(Colors[s].success);
      expect(contrastRatio(t.success, t.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.success, t.surface)).toBeGreaterThanOrEqual(4.5);
      expect(t.danger).toBe(Colors[s].danger);
    }
  });
});

describe('inicial de otra persona (RF-T10)', () => {
  it('es su primera letra en mayúscula, con acentos', () => {
    expect(initialOf('ana')).toBe('A');
    expect(initialOf('  Úrsula ')).toBe('Ú');
  });

  it('sin nombre no hay inicial', () => {
    expect(initialOf(null)).toBeNull();
    expect(initialOf('   ')).toBeNull();
  });
});
