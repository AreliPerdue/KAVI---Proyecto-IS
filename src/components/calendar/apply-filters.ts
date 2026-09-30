import type { CalendarFilters } from '@/store/calendar-store';
import type { Activity } from '@/types/domain';

/** Filtra por dimensión y/o tema (combinables: una actividad pasa si cumple cualquiera de los seleccionados). */
export function applyFilters(activities: readonly Activity[], filters: CalendarFilters): Activity[] {
  // `onlyListItems` esconde las actividades enteras y se resuelve en la pantalla; aquí
  // solo importan dimensión y tema, y sin ninguno de los dos no hay nada que filtrar.
  if (filters.dimensions.length === 0 && filters.themeIds.length === 0) return [...activities];
  return activities.filter(
    (a) =>
      (a.dimension !== null && filters.dimensions.includes(a.dimension)) ||
      (a.theme_id !== null && filters.themeIds.includes(a.theme_id)),
  );
}
