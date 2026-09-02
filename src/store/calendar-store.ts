import { create } from 'zustand';

import type { Dimension } from '@/constants/dimensions';
import { type CalendarView, toDayKey } from '@/lib/dates';
import { getJson, setJson } from '@/lib/storage';

const PREFS_KEY = 'kavi.calendar.prefs';

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
  /** Contacto cuyo calendario se superpone al mío (null = solo yo). */
  overlayUserId: string | null;
  hydrated: boolean;
  setView: (view: CalendarView) => void;
  setAnchorKey: (key: string) => void;
  goToday: () => void;
  setFilters: (filters: CalendarFilters) => void;
  clearFilters: () => void;
  setOverlayUserId: (id: string | null) => void;
  hydrate: () => Promise<void>;
};

/** Estado local del calendario (plan §1: Zustand mínimo). La vista se persiste (RF-C4). */
export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: 'month',
  anchorKey: toDayKey(new Date()),
  filters: EMPTY_FILTERS,
  overlayUserId: null,
  hydrated: false,

  setView: (view) => {
    set({ view });
    void setJson(PREFS_KEY, { view } satisfies Prefs);
  },
  setAnchorKey: (anchorKey) => set({ anchorKey }),
  goToday: () => set({ anchorKey: toDayKey(new Date()) }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
  setOverlayUserId: (overlayUserId) => set({ overlayUserId }),

  hydrate: async () => {
    if (get().hydrated) return;
    const prefs = await getJson<Prefs>(PREFS_KEY);
    set({ view: prefs?.view ?? 'month', hydrated: true });
  },
}));

export function hasActiveFilters(filters: CalendarFilters): boolean {
  return filters.dimensions.length > 0 || filters.themeIds.length > 0;
}
