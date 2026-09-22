/**
 * Estado local del calendario (plan §1). La sutileza que fija este archivo:
 * elegir vista en el menu se recuerda entre sesiones, pero abrir un dia desde el
 * mes NO convierte "dia" en la vista por defecto (RF-C1, RF-C4).
 */
import { EMPTY_FILTERS, hasActiveFilters } from '@/store/calendar-store';
import type { CalendarFilters } from '@/store/calendar-store';

type Store = typeof import('@/store/calendar-store');

function fresh(): Store {
  jest.resetModules();
  /* eslint-disable-next-line @typescript-eslint/no-require-imports -- el store es un singleton de modulo */
  return require('@/store/calendar-store') as Store;
}

describe('valores iniciales', () => {
  it('abre en vista mensual', () => {
    const { useCalendarStore, DEFAULT_VIEW } = fresh();
    expect(DEFAULT_VIEW).toBe('month');
    expect(useCalendarStore.getState().view).toBe('month');
  });

  it('el ancla es hoy en formato yyyy-MM-dd', () => {
    const { useCalendarStore } = fresh();
    expect(useCalendarStore.getState().anchorKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('nace sin filtros ni superposiciones', () => {
    const { useCalendarStore } = fresh();
    const s = useCalendarStore.getState();
    expect(s.filters).toEqual(EMPTY_FILTERS);
    expect(s.overlayUserIds).toEqual([]);
    expect(s.hydrated).toBe(false);
  });
});

describe('vista y navegacion', () => {
  it('setView cambia la vista', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().setView('week');
    expect(useCalendarStore.getState().view).toBe('week');
  });

  it('setAnchorKey mueve el ancla sin tocar la vista', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().setAnchorKey('2026-09-07');
    const s = useCalendarStore.getState();
    expect(s.anchorKey).toBe('2026-09-07');
    expect(s.view).toBe('month');
  });

  it('openDay lleva a la vista diaria de ese dia', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().openDay('2026-09-07');
    const s = useCalendarStore.getState();
    expect(s.view).toBe('day');
    expect(s.anchorKey).toBe('2026-09-07');
  });

  it('goToday vuelve al ancla de hoy', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().setAnchorKey('2020-01-01');
    useCalendarStore.getState().goToday();
    expect(useCalendarStore.getState().anchorKey).not.toBe('2020-01-01');
  });
});

describe('filtros', () => {
  const conFiltros: CalendarFilters = { dimensions: ['fisica'], themeIds: [] };

  it('setFilters los aplica', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().setFilters(conFiltros);
    expect(useCalendarStore.getState().filters).toEqual(conFiltros);
  });

  it('clearFilters los vacia', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().setFilters(conFiltros);
    useCalendarStore.getState().clearFilters();
    expect(useCalendarStore.getState().filters).toEqual(EMPTY_FILTERS);
  });

  it('hasActiveFilters distingue vacio de con contenido', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ dimensions: ['social'], themeIds: [] })).toBe(true);
    expect(hasActiveFilters({ dimensions: [], themeIds: ['t1'] })).toBe(true);
  });
});

describe('calendarios superpuestos (RF-S15)', () => {
  it('toggle anade y quita', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().toggleOverlayUser('ana');
    expect(useCalendarStore.getState().overlayUserIds).toEqual(['ana']);

    useCalendarStore.getState().toggleOverlayUser('ana');
    expect(useCalendarStore.getState().overlayUserIds).toEqual([]);
  });

  it('acepta varias personas y conserva el orden', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().toggleOverlayUser('ana');
    useCalendarStore.getState().toggleOverlayUser('pedro');
    expect(useCalendarStore.getState().overlayUserIds).toEqual(['ana', 'pedro']);
  });

  it('clearOverlayUsers vuelve a "solo yo"', () => {
    const { useCalendarStore } = fresh();
    useCalendarStore.getState().toggleOverlayUser('ana');
    useCalendarStore.getState().clearOverlayUsers();
    expect(useCalendarStore.getState().overlayUserIds).toEqual([]);
  });
});

describe('hidratacion', () => {
  it('marca hydrated al terminar', async () => {
    const { useCalendarStore } = fresh();
    await useCalendarStore.getState().hydrate();
    expect(useCalendarStore.getState().hydrated).toBe(true);
  });

  it('sin preferencia guardada cae a la vista por defecto', async () => {
    const { useCalendarStore } = fresh();
    await useCalendarStore.getState().hydrate();
    expect(useCalendarStore.getState().view).toBe('month');
  });

  it('no vuelve a hidratar si ya lo hizo', async () => {
    const { useCalendarStore } = fresh();
    await useCalendarStore.getState().hydrate();
    useCalendarStore.getState().setView('day');
    await useCalendarStore.getState().hydrate();
    expect(useCalendarStore.getState().view).toBe('day');
  });
});
