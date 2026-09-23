/**
 * Colores de persona para el calendario superpuesto (RF-S15).
 *
 * Esta paleta existe para **distinguir** a la gente, asi que las dos propiedades que la
 * hacen util son medibles y se comprueban aqui en vez de revisarse a ojo: que cada color
 * contraste con los dos fondos de la app (se puede cambiar de tema) y que ningun par se
 * confunda entre si. Si alguien retoca un hex, una de las dos falla.
 */
import {
  assignPeopleColors,
  colorDeNobi,
  DEFAULT_SELF_COLOR,
  nextAvailableColor,
  PEOPLE_COLORS,
} from '@/constants/people-colors';
import { NOBIS } from '@/constants/nobi';
import { Colors } from '@/constants/theme';

/** Luminancia relativa (WCAG). */
function luminancia(hex: string): number {
  const canales = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Distancia perceptual (CIE76): por debajo de ~13 dos colores se confunden. */
function distancia(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, b2] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const x = (r * 0.4124 + g * 0.3576 + b2 * 0.1805) / 0.95047;
    const y = r * 0.2126 + g * 0.7152 + b2 * 0.0722;
    const z = (r * 0.0193 + g * 0.1192 + b2 * 0.9505) / 1.08883;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const [fx, fy, fz] = [f(x), f(y), f(z)];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

describe('la paleta', () => {
  it('tiene un color por cada Nobi, con el mismo id', () => {
    expect(PEOPLE_COLORS.map((c) => c.id).sort()).toEqual(NOBIS.map((n) => n.id).sort());
  });

  it('no repite ningun hex', () => {
    expect(new Set(PEOPLE_COLORS.map((c) => c.hex)).size).toBe(PEOPLE_COLORS.length);
  });

  it('todos los hex estan bien formados', () => {
    for (const c of PEOPLE_COLORS) expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  /**
   * El color aqui lleva significado (kavi-design §5), y la apariencia se puede cambiar
   * (NFR-18): un color que solo funcione en oscuro deja de verse al pasar a claro.
   */
  it('todos contrastan al menos 3:1 sobre los dos fondos', () => {
    const flojos = PEOPLE_COLORS.filter(
      (c) => contraste(c.hex, Colors.dark.background) < 3 || contraste(c.hex, Colors.light.background) < 3,
    ).map((c) => c.id);
    expect(flojos).toEqual([]);
  });

  /** Dos personas del mismo color, en la vista que existe para distinguirlas, no sirve. */
  it('ningun par se confunde entre si', () => {
    const parecidos: string[] = [];
    for (let i = 0; i < PEOPLE_COLORS.length; i++) {
      for (let j = i + 1; j < PEOPLE_COLORS.length; j++) {
        if (distancia(PEOPLE_COLORS[i].hex, PEOPLE_COLORS[j].hex) < 13) {
          parecidos.push(`${PEOPLE_COLORS[i].id}~${PEOPLE_COLORS[j].id}`);
        }
      }
    }
    expect(parecidos).toEqual([]);
  });

  /** Veinte y no ocho: con ocho, del noveno contacto en adelante se repetian. */
  it('hay veinte, uno por contacto habitual', () => {
    expect(PEOPLE_COLORS.length).toBe(20);
  });
});

describe('el color que corresponde a un Nobi', () => {
  it('es el de su mismo id', () => {
    const esperado = PEOPLE_COLORS.find((c) => c.id === 'turquois')?.hex;
    expect(colorDeNobi('nobi:turquois')).toBe(esperado);
  });

  it('sin Nobi elegido no hay color', () => {
    expect(colorDeNobi(null)).toBeNull();
    expect(colorDeNobi(undefined)).toBeNull();
  });

  it('un avatar que no es un Nobi tampoco da color', () => {
    expect(colorDeNobi('https://ejemplo.mx/foto.png')).toBeNull();
  });
});

describe('repartir los colores', () => {
  const persona = (id: string, over: Record<string, unknown> = {}) => ({ userId: id, color: null, ...over });

  it('respeta el color elegido a mano', () => {
    const elegido = PEOPLE_COLORS[5].hex;
    const m = assignPeopleColors([persona('u2', { color: elegido })]);
    expect(m.get('u2')).toBe(elegido);
  });

  /** Que cada quien salga del color con el que se presenta es el motivo de emparejarlos. */
  it('sin color a mano usa el del Nobi de esa persona', () => {
    const m = assignPeopleColors([persona('u2', { avatarUrl: 'nobi:green' })]);
    expect(m.get('u2')).toBe(PEOPLE_COLORS.find((c) => c.id === 'green')?.hex);
  });

  it('si el del Nobi ya esta ocupado, le da otro', () => {
    const verde = PEOPLE_COLORS.find((c) => c.id === 'green')!.hex;
    const m = assignPeopleColors([persona('u2', { color: verde }), persona('u3', { avatarUrl: 'nobi:green' })]);
    expect(m.get('u3')).not.toBe(verde);
    expect(m.get('u3')).toBeTruthy();
  });

  it('sin Nobi ni color reparte los libres', () => {
    const m = assignPeopleColors([persona('u2'), persona('u3')]);
    expect(m.get('u2')).not.toBe(m.get('u3'));
  });

  it('nunca reparte mi propio color', () => {
    const mio = PEOPLE_COLORS[3].hex;
    const m = assignPeopleColors([persona('u2'), persona('u3')], mio);
    expect([...m.values()]).not.toContain(mio);
  });

  it('con mas gente que colores reutiliza en vez de dejar a alguien sin color', () => {
    const muchos = Array.from({ length: PEOPLE_COLORS.length + 3 }, (_, i) => persona(`u${i}`));
    const m = assignPeopleColors(muchos);
    expect(m.size).toBe(muchos.length);
    for (const v of m.values()) expect(v).toBeTruthy();
  });

  it('sin contactos devuelve un mapa vacio', () => {
    expect(assignPeopleColors([]).size).toBe(0);
  });
});

describe('el siguiente color libre', () => {
  it('no es el mio', () => {
    expect(nextAvailableColor([])).not.toBe(DEFAULT_SELF_COLOR);
  });

  it('no repite los que ya estan en uso', () => {
    const usados = PEOPLE_COLORS.slice(0, 5).map((c) => c.hex);
    expect(usados).not.toContain(nextAvailableColor(usados));
  });

  it('con todos ocupados devuelve uno valido en vez de fallar', () => {
    const todos = PEOPLE_COLORS.map((c) => c.hex);
    expect(PEOPLE_COLORS.map((c) => c.hex)).toContain(nextAvailableColor(todos));
  });
});
