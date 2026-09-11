import { create } from 'zustand';

import type { Dimension } from '@/constants/dimensions';
import { type CalendarView, toDayKey } from '@/lib/dates';
import { getJson, setJson } from '@/lib/storage';

const PREFS_KEY = 'kavi.calendar.prefs';

/** Vista con la que abre el calendario mientras no se elija otra (RF-C1). */
export const DEFAULT_VIEW: CalendarView = 'month';

type Prefs = { view: CalendarView };

export type CalendarFilters = {
  dimensions: Dimension[];
  themeIds: string[];
};

export const EMPTY_FILTERS: CalendarFilters = { dimensions: [], themeIds: [] };

type CalendarState = {
  view: CalendarView;
  /** Día ancla en formato 'yyyy-MM-dd' (zona local). */
  anchorKey: string;
  filters: CalendarFilters;
  /** Contactos cuyos calendarios se superponen al mío (vacío = solo yo) (RF-S15). */
  overlayUserIds: string[];
  hydrated: boolean;
  /** Elección explícita en el menú de vista: se recuerda entre sesiones (RF-C4). */
  setView: (view: CalendarView) => void;
  setAnchorKey: (key: string) => void;
  /** Entrar al detalle de un día desde el mes: navegación, no preferencia. */
  openDay: (key: string) => void;
  goToday: () => void;
  setFilters: (filters: CalendarFilters) => void;
  clearFilters: () => void;
  toggleOverlayUser: (id: string) => void;
  clearOverlayUsers: () => void;
  hydrate: () => Promise<void>;
};

/**
 * Estado local del calendario (plan §1: Zustand mínimo).
 * Solo se persiste la vista elegida a mano en el menú; abrir un día desde el mes
 * navega a la vista diaria sin convertirla en la vista por defecto, de modo que el
 * calendario sigue abriendo en mensual (RF-C1, RF-C4).
 */
export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: DEFAULT_VIEW,
  anchorKey: toDayKey(new Date()),
  filters: EMPTY_FILTERS,
  overlayUserIds: [],
  hydrated: false,

  setView: (view) => {
    set({ view });
    void setJson(PREFS_KEY, { view } satisfies Prefs);
  },
  setAnchorKey: (anchorKey) => set({ anchorKey }),
  openDay: (anchorKey) => set({ anchorKey, view: 'day' }),
  goToday: () => set({ anchorKey: toDayKey(new Date()) }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  toggleOverlayUser: (id) =>
    set((state) => ({
      overlayUserIds: state.overlayUserIds.includes(id)
        ? state.overlayUserIds.filter((x) => x !== id)
        : [...state.overlayUserIds, id],
    })),
  clearOverlayUsers: () => set({ overlayUserIds: [] }),

  hydrate: async () => {
    if (get().hydrated) return;
    const prefs = await getJson<Prefs>(PREFS_KEY);
    set({ view: prefs?.view ?? DEFAULT_VIEW, hydrated: true });
  },
}));

export function hasActiveFilters(filters: CalendarFilters): boolean {
  return filters.dimensions.length > 0 || filters.themeIds.length > 0;
}
