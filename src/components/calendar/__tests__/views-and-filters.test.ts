/**
 * Vistas, filtros y horas del calendario (spec 04; T191 – T193, T205, T206, T217; formato de
 * 12 horas en toda la app).
 */
import { applyFilters } from '@/components/calendar/apply-filters';
import { isDerivedActivity, isListDerived } from '@/components/calendar/derived';
import { formatClock, formatHour, formatHourLabel, rangeForView, setTimeFormat, shiftAnchor } from '@/lib/dates';
import { hasActiveFilters, type CalendarFilters } from '@/store/calendar-store';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Activity } from '@/types/domain';

const sinFiltros: CalendarFilters = { dimensions: [], themeIds: [], onlyListItems: false };

describe('vistas: tres días y agenda (T191, T192)', () => {
  const miercoles = new Date(2026, 9, 7, 15, 0);

  it('tres días: desde el ancla, tres días completos', () => {
    const r = rangeForView('threeDays', miercoles);
    expect(r.from).toEqual(new Date(2026, 9, 7));
    expect(r.to).toEqual(new Date(2026, 9, 10));
    expect(shiftAnchor('threeDays', miercoles, 1).getDate()).toBe(10);
    expect(shiftAnchor('threeDays', miercoles, -1).getDate()).toBe(4);
  });

  it('agenda: el mismo rango que el mes, y se mueve de mes en mes', () => {
    expect(rangeForView('agenda', miercoles)).toEqual(rangeForView('month', miercoles));
    expect(shiftAnchor('agenda', miercoles, 1).getMonth()).toBe(10);
  });
});

describe('pastilla de vistas (T193)', () => {
  beforeEach(() => usePreferencesStore.setState({ pinnedViews: ['day', 'week', 'month'] }));

  it('fijar una vista la pone en su orden canónico, no al final', () => {
    usePreferencesStore.getState().togglePinnedView('threeDays');
    expect(usePreferencesStore.getState().pinnedViews).toEqual(['day', 'threeDays', 'week', 'month']);
  });

  it('nunca deja la pastilla vacía', () => {
    usePreferencesStore.setState({ pinnedViews: ['week'] });
    usePreferencesStore.getState().togglePinnedView('week');
    expect(usePreferencesStore.getState().pinnedViews).toEqual(['week']);
  });
});

describe('filtros (T205, T206)', () => {
  const act = (over: Partial<Activity>): Activity => ({ id: 'a', dimension: null, theme_id: null, ...over }) as Activity;

  it('"solo pendientes de listas" cuenta como filtro activo aunque no haya dimensión ni tema', () => {
    expect(hasActiveFilters(sinFiltros)).toBe(false);
    expect(hasActiveFilters({ ...sinFiltros, onlyListItems: true })).toBe(true);
  });

  it('applyFilters ignora "solo listas": recibe actividades y devuelve actividades', () => {
    const todas = [act({ id: '1', dimension: 'fisica' }), act({ id: '2' })];
    expect(applyFilters(todas, { ...sinFiltros, onlyListItems: true })).toEqual(todas);
  });

  it('dimensión o tema: pasa la que cumpla cualquiera de los elegidos', () => {
    const todas = [act({ id: '1', dimension: 'fisica' }), act({ id: '2', theme_id: 't9' }), act({ id: '3', dimension: 'social' })];
    expect(applyFilters(todas, { ...sinFiltros, dimensions: ['fisica'], themeIds: ['t9'] }).map((a) => a.id)).toEqual(['1', '2']);
  });
});

describe('capas derivadas (T217, T235)', () => {
  it('pendientes y rutinas de listas son derivados: no se editan ni comparten', () => {
    for (const id of ['listitem-i1', 'listrutina-l1@2026-10-07', 'workout-w1', 'birthday-u1']) {
      expect(isDerivedActivity({ id })).toBe(true);
    }
    expect(isDerivedActivity({ id: '7d0f…' })).toBe(false);
  });

  it('solo los de listas llevan la palomita en vez de la hora', () => {
    expect(isListDerived({ id: 'listitem-i1' })).toBe(true);
    expect(isListDerived({ id: 'workout-w1' })).toBe(false);
  });
});

describe('formato de 12 horas en toda la app', () => {
  afterEach(() => setTimeFormat('24h'));

  it('formatClock acepta la columna `time` de Postgres', () => {
    setTimeFormat('24h');
    expect(formatClock('17:30:00', 'es')).toBe('17:30');
    setTimeFormat('12h');
    expect(formatClock('17:30:00', 'es')).toBe('5:30 p.m.');
    expect(formatClock('17:30', 'en')).toBe('5:30 PM');
  });

  it('las 0 son las 12 a.m. y las 12 son las 12 p.m.', () => {
    setTimeFormat('12h');
    expect(formatHour(0, 'es')).toBe('12:00 a.m.');
    expect(formatHour(12, 'es')).toBe('12:00 p.m.');
    expect(formatHourLabel(14, 'en')).toBe('2 PM');
  });
});
