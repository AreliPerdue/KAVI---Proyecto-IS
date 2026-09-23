/**
 * Utilidades puras del calendario: filtros, agrupacion por dia, superposicion de
 * calendarios ajenos y color de bloque. Son la capa que decide que se ve en cada
 * celda y de que color, asi que un error aqui se nota en toda la pantalla.
 */
import { applyFilters } from '@/components/calendar/apply-filters';
import { activityColor, tint } from '@/components/calendar/activity-style';
import { groupByDay } from '@/components/calendar/group-by-day';
import { blocksToActivities, isOverlayActivity, OVERLAY_PREFIX } from '@/components/calendar/overlay';
import { Colors } from '@/constants/theme';
import { EMPTY_FILTERS } from '@/store/calendar-store';
import type { Activity, AvailabilityBlock } from '@/types/domain';

const actividad = (over: Partial<Activity> = {}): Activity =>
  ({
    id: 'a1', owner_id: 'u1', title: 'Junta', description: null, theme_id: null,
    dimension: null, color: null, icon: null, all_day: false, is_gym: false,
    recurrence_rule: null, recurrence_parent_id: null, created_at: 'x', updated_at: 'x',
    start_at: new Date(2026, 8, 7, 9).toISOString(),
    end_at: new Date(2026, 8, 7, 10).toISOString(),
    ...over,
  }) as Activity;

describe('applyFilters', () => {
  it('sin filtros devuelve todo', () => {
    const todas = [actividad(), actividad({ id: 'a2' })];
    expect(applyFilters(todas, EMPTY_FILTERS)).toHaveLength(2);
  });

  it('sin filtros devuelve una copia, no el mismo arreglo', () => {
    const todas = [actividad()];
    expect(applyFilters(todas, EMPTY_FILTERS)).not.toBe(todas);
  });

  it('filtra por dimension', () => {
    const todas = [actividad({ id: 'fis', dimension: 'fisica' }), actividad({ id: 'soc', dimension: 'social' })];

    const r = applyFilters(todas, { dimensions: ['fisica'], themeIds: [] });

    expect(r.map((a) => a.id)).toEqual(['fis']);
  });

  it('filtra por tema', () => {
    const todas = [actividad({ id: 'con', theme_id: 't1' }), actividad({ id: 'sin', theme_id: 't2' })];

    const r = applyFilters(todas, { dimensions: [], themeIds: ['t1'] });

    expect(r.map((a) => a.id)).toEqual(['con']);
  });

  it('los filtros se combinan con O: basta cumplir uno', () => {
    const todas = [
      actividad({ id: 'porDimension', dimension: 'fisica' }),
      actividad({ id: 'porTema', theme_id: 't1' }),
      actividad({ id: 'ninguno' }),
    ];

    const r = applyFilters(todas, { dimensions: ['fisica'], themeIds: ['t1'] });

    expect(r.map((a) => a.id).sort()).toEqual(['porDimension', 'porTema']);
  });

  it('una actividad sin dimension ni tema se descarta al filtrar', () => {
    const r = applyFilters([actividad()], { dimensions: ['fisica'], themeIds: [] });
    expect(r).toEqual([]);
  });
});

describe('groupByDay', () => {
  it('indexa por clave de dia local', () => {
    const mapa = groupByDay([actividad()]);
    expect([...mapa.keys()]).toEqual(['2026-09-07']);
  });

  it('una actividad de varios dias aparece en cada uno', () => {
    const larga = actividad({
      start_at: new Date(2026, 8, 7, 22).toISOString(),
      end_at: new Date(2026, 8, 9, 3).toISOString(),
    });

    const mapa = groupByDay([larga]);

    expect([...mapa.keys()].sort()).toEqual(['2026-09-07', '2026-09-08', '2026-09-09']);
  });

  it('dentro de cada dia van en orden cronologico', () => {
    const tarde = actividad({ id: 'tarde', start_at: new Date(2026, 8, 7, 15).toISOString(), end_at: new Date(2026, 8, 7, 16).toISOString() });
    const manana = actividad({ id: 'manana' });

    const mapa = groupByDay([tarde, manana]);

    expect(mapa.get('2026-09-07')?.map((a) => a.id)).toEqual(['manana', 'tarde']);
  });

  it('a igual hora desempata por titulo, para que el orden sea estable', () => {
    const zeta = actividad({ id: 'z', title: 'Zumba' });
    const alfa = actividad({ id: 'a', title: 'Ajedrez' });

    const mapa = groupByDay([zeta, alfa]);

    expect(mapa.get('2026-09-07')?.map((a) => a.title)).toEqual(['Ajedrez', 'Zumba']);
  });

  it('sin actividades devuelve un mapa vacio', () => {
    expect(groupByDay([]).size).toBe(0);
  });
});

describe('superposicion de calendarios (RF-S15)', () => {
  const bloque = (over = {}) => ({
    user_id: 'u2', title: null, color: null,
    start_at: new Date(2026, 8, 7, 9).toISOString(),
    end_at: new Date(2026, 8, 7, 10).toISOString(),
    ...over,
  });

  it('convierte bloques en actividades de solo lectura', () => {
    const r = blocksToActivities([bloque()], () => 'Ana', () => '#4C8DFF');

    expect(r).toHaveLength(1);
    expect(isOverlayActivity(r[0]!)).toBe(true);
  });

  it('un bloque sin titulo se llama "Ocupado"', () => {
    const [a] = blocksToActivities([bloque()], () => 'Ana', () => '#000');
    expect(a?.title).toBe('Ocupado');
  });

  it('con titulo visible lo conserva', () => {
    const [a] = blocksToActivities([bloque({ title: 'Clase de piano' })], () => 'Ana', () => '#000');
    expect(a?.title).toBe('Clase de piano');
  });

  it('el color y el nombre salen de quien es el dueno', () => {
    const [a] = blocksToActivities([bloque()], (id) => `nombre-${id}`, (id) => `color-${id}`);

    expect(a?.owner_name).toBe('nombre-u2');
    expect(a?.color).toBe('color-u2');
  });

  it('los ids no chocan aunque coincidan persona y hora', () => {
    const r = blocksToActivities([bloque(), bloque()], () => 'Ana', () => '#000');
    expect(r[0]?.id).not.toBe(r[1]?.id);
  });

  it('una actividad normal no se confunde con una superpuesta', () => {
    expect(isOverlayActivity(actividad())).toBe(false);
    expect(isOverlayActivity({ id: `${OVERLAY_PREFIX}x` })).toBe(true);
  });
});

describe('color del bloque (RF-T4)', () => {
  it('usa el color copiado de la actividad', () => {
    expect(activityColor({ color: '#4CAF50' }, Colors.dark)).toBe('#4CAF50');
  });

  it('sin color cae al neutro del tema', () => {
    expect(activityColor({ color: null }, Colors.dark)).toBe(Colors.dark.neutralActivity);
  });
});

describe('tint', () => {
  it('convierte un hex de 6 digitos en rgba al 14 %', () => {
    expect(tint('#4CAF50')).toBe('rgba(76,175,80,0.14)');
  });

  it('acepta hex de 3 digitos', () => {
    expect(tint('#0F0')).toBe('rgba(0,255,0,0.14)');
  });

  it('acepta hex sin almohadilla', () => {
    expect(tint('4CAF50')).toBe('rgba(76,175,80,0.14)');
  });

  it('admite otra opacidad', () => {
    expect(tint('#000000', 0.5)).toBe('rgba(0,0,0,0.5)');
  });
});

/**
 * Duplicado al superponer (regresión).
 *
 * Una actividad que un contacto me compartió ya está en mi calendario. Al superponer
 * su agenda, esa misma actividad vuelve a llegar como bloque de disponibilidad, así
 * que sin descartarla se pinta dos veces, una sobre otra.
 */
describe('no duplicar lo que ya tengo', () => {
  const bloque = (over: Partial<AvailabilityBlock> = {}): AvailabilityBlock => ({
    user_id: 'ana',
    start_at: '2026-09-23T15:00:00.000Z',
    end_at: '2026-09-23T16:00:00.000Z',
    title: 'Comida',
    color: '#E91E63',
    ...over,
  });

  const mia = (over: Partial<Activity> = {}): Activity =>
    ({
      id: 'a1', owner_id: 'ana', title: 'Comida', description: null, theme_id: null,
      dimension: null, color: '#E91E63', icon: null, all_day: false, is_gym: false,
      recurrence_rule: null, recurrence_parent_id: null, created_at: 'x', updated_at: 'x',
      start_at: '2026-09-23T15:00:00.000Z',
      end_at: '2026-09-23T16:00:00.000Z',
      ...over,
    }) as Activity;

  const nombre = () => 'Ana';
  const color = () => '#E91E63';

  it('sin nada propio los bloques pasan tal cual', () => {
    expect(blocksToActivities([bloque()], nombre, color)).toHaveLength(1);
  });

  it('descarta el bloque de una actividad que ya tengo compartida', () => {
    expect(blocksToActivities([bloque()], nombre, color, [mia()])).toHaveLength(0);
  });

  it('una actividad de la misma persona a otra hora si se pinta', () => {
    const otra = mia({ start_at: '2026-09-23T18:00:00.000Z', end_at: '2026-09-23T19:00:00.000Z' });
    expect(blocksToActivities([bloque()], nombre, color, [otra])).toHaveLength(1);
  });

  /** Coincidir en horario con otra persona es normal, no es el mismo evento. */
  it('el mismo horario pero de otra persona no se descarta', () => {
    expect(blocksToActivities([bloque({ user_id: 'luis' })], nombre, color, [mia()])).toHaveLength(1);
  });

  it('mis propias actividades no descartan bloques ajenos', () => {
    const propia = mia({ owner_id: 'yo' });
    expect(blocksToActivities([bloque()], nombre, color, [propia])).toHaveLength(1);
  });

  it('descarta solo los que coinciden, no la lista entera', () => {
    const bloques = [bloque(), bloque({ start_at: '2026-09-23T18:00:00.000Z', end_at: '2026-09-23T19:00:00.000Z' })];
    expect(blocksToActivities(bloques, nombre, color, [mia()])).toHaveLength(1);
  });
});
