import type { Activity, AvailabilityBlock } from '@/types/domain';

export const OVERLAY_PREFIX = 'overlay-';

export function isOverlayActivity(activity: Pick<Activity, 'id'>): boolean {
  return activity.id.startsWith(OVERLAY_PREFIX);
}

/**
 * Convierte bloques de disponibilidad en actividades de solo lectura para pintarlas
 * en las vistas. El color y el nombre salen de quién es su dueño (RF-S15): con `busy`
 * el bloque no trae título, así que el color de persona es la única pista visual.
 *
 * `propias` evita un duplicado real: una actividad que un contacto me compartió ya
 * está en mi calendario, y al superponer su agenda vuelve a llegar como bloque de
 * disponibilidad. Se descartan los bloques que coinciden con algo que ya tengo del
 * mismo dueño y en el mismo horario.
 */
export function blocksToActivities(
  blocks: readonly AvailabilityBlock[],
  nameOf: (userId: string) => string,
  colorOf: (userId: string) => string,
  propias: readonly Activity[] = [],
): Activity[] {
  const yaVisibles = new Set(propias.map((a) => `${a.owner_id}|${a.start_at}|${a.end_at}`));
  return blocks
    .filter((b) => !yaVisibles.has(`${b.user_id}|${b.start_at}|${b.end_at}`))
    .map((b, i) => ({
    id: `${OVERLAY_PREFIX}${b.user_id}-${i}-${b.start_at}`,
    owner_id: b.user_id,
    owner_name: nameOf(b.user_id),
    title: b.title ?? 'Ocupado',
    description: null,
    theme_id: null,
    dimension: null,
    color: colorOf(b.user_id),
    icon: null,
    start_at: b.start_at,
    end_at: b.end_at,
    all_day: false,
    recurrence_rule: null,
    recurrence_parent_id: null,
    is_gym: false,
    // Un bloque superpuesto ya viene filtrado por la base: si era privado, llega sin título.
    is_private: false,
    created_at: b.start_at,
    updated_at: b.start_at,
  }));
}
