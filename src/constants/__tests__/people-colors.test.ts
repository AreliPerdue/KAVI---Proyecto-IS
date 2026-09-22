/**
 * Colores de persona para el calendario superpuesto (RF-S15).
 *
 * Es una derivacion pura que nunca escribe: por eso todo contacto —incluidos los
 * del seed, que nunca eligieron color— tiene uno asignado de forma estable. Lo
 * critico es que no se repita un color entre contactos mientras queden libres, y
 * que el color de "Tú" quede reservado.
 */
import {
  assignPeopleColors,
  nextAvailableColor,
  PEOPLE_COLORS,
  SELF_COLOR,
} from '@/constants/people-colors';

const c = (userId: string, color: string | null = null) => ({ userId, color });

describe('paleta', () => {
  it('son 8 colores con id, etiqueta y hex', () => {
    expect(PEOPLE_COLORS).toHaveLength(8);
    for (const color of PEOPLE_COLORS) {
      expect(color.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color.label.length).toBeGreaterThan(0);
    }
  });

  it('no hay hex repetidos', () => {
    expect(new Set(PEOPLE_COLORS.map((x) => x.hex)).size).toBe(PEOPLE_COLORS.length);
  });

  it('el color de "Tú" es el primero de la paleta', () => {
    expect(SELF_COLOR).toBe(PEOPLE_COLORS[0]?.hex);
  });
});

describe('assignPeopleColors', () => {
  it('sin contactos devuelve un mapa vacio', () => {
    expect(assignPeopleColors([]).size).toBe(0);
  });

  it('asigna un color a cada contacto', () => {
    const m = assignPeopleColors([c('a'), c('b'), c('c')]);
    expect(m.size).toBe(3);
    for (const id of ['a', 'b', 'c']) expect(m.get(id)).toMatch(/^#/);
  });

  it('respeta el color elegido a mano', () => {
    const elegido = PEOPLE_COLORS[3]!.hex;
    expect(assignPeopleColors([c('a', elegido)]).get('a')).toBe(elegido);
  });

  it('nunca reparte el color reservado para "Tú"', () => {
    const m = assignPeopleColors([c('a'), c('b'), c('c')]);
    expect([...m.values()]).not.toContain(SELF_COLOR);
  });

  it('no repite color entre contactos mientras queden libres', () => {
    const m = assignPeopleColors([c('a'), c('b'), c('c'), c('d')]);
    expect(new Set(m.values()).size).toBe(4);
  });

  it('un color elegido a mano deja de ofrecerse al resto', () => {
    const elegido = PEOPLE_COLORS[1]!.hex;
    const m = assignPeopleColors([c('a', elegido), c('b'), c('c')]);
    expect(m.get('b')).not.toBe(elegido);
    expect(m.get('c')).not.toBe(elegido);
  });

  it('es estable: el mismo orden da el mismo reparto', () => {
    const entrada = [c('a'), c('b'), c('c')];
    expect([...assignPeopleColors(entrada)]).toEqual([...assignPeopleColors(entrada)]);
  });

  it('con mas contactos que colores reutiliza en vez de dejar a alguien sin color', () => {
    const muchos = Array.from({ length: 12 }, (_, i) => c(`u${i}`));
    const m = assignPeopleColors(muchos);
    expect(m.size).toBe(12);
    for (const [, hex] of m) expect(hex).toMatch(/^#/);
  });
});

describe('nextAvailableColor', () => {
  it('sin nada en uso devuelve el primero libre despues del de "Tú"', () => {
    expect(nextAvailableColor([])).toBe(PEOPLE_COLORS[1]?.hex);
  });

  it('salta los que ya estan en uso', () => {
    const usados = [PEOPLE_COLORS[1]!.hex, PEOPLE_COLORS[2]!.hex];
    expect(nextAvailableColor(usados)).toBe(PEOPLE_COLORS[3]?.hex);
  });

  it('nunca devuelve el color de "Tú"', () => {
    expect(nextAvailableColor([])).not.toBe(SELF_COLOR);
  });

  it('agotada la paleta cae a un color valido', () => {
    expect(nextAvailableColor(PEOPLE_COLORS.map((x) => x.hex))).toMatch(/^#/);
  });
});
