import { type CalendarFilters, hasActiveFilters } from '@/store/calendar-store';
import type { Activity } from '@/types/domain';

/** Filtra por dimensión y/o tema (combinables: una actividad pasa si cumple cualquiera de los seleccionados). */
export function applyFilters(activities: readonly Activity[], filters: CalendarFilters): Activity[] {
  if (!hasActiveFilters(filters)) return [...activities];
  return activities.filter(
    (a) =>
      (a.dimension !== null && filters.dimensions.includes(a.dimension)) ||
      (a.theme_id !== null && filters.themeIds.includes(a.theme_id)),
  );
}
