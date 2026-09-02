import type { AvailabilityBlock } from '@/types/domain';
import type { Activity } from '@/types/domain';

export const OVERLAY_PREFIX = 'overlay-';

/** Paleta para calendarios de contactos superpuestos (distinta de las 7 dimensiones). */
export const OVERLAY_COLORS = ['#F2A93B', '#7C4DFF', '#00BCD4', '#8D6E63', '#EC407A'] as const;

export function overlayColor(index: number): string {
  return OVERLAY_COLORS[index % OVERLAY_COLORS.length] ?? '#F2A93B';
}

export function isOverlayActivity(activity: Pick<Activity, 'id'>): boolean {
  return activity.id.startsWith(OVERLAY_PREFIX);
}

/** Convierte bloques de disponibilidad en actividades de solo lectura para pintarlas en las vistas. */
export function blocksToActivities(blocks: readonly AvailabilityBlock[], ownerName: string, color: string): Activity[] {
  return blocks.map((b, i) => ({
    id: `${OVERLAY_PREFIX}${b.user_id}-${i}-${b.start_at}`,
    owner_id: b.user_id,
    owner_name: ownerName,
    title: b.title ?? 'Ocupado',
    description: null,
    theme_id: null,
    dimension: null,
    color,
    icon: null,
    start_at: b.start_at,
    end_at: b.end_at,
    all_day: false,
    recurrence_rule: null,
    recurrence_parent_id: null,
    is_gym: false,
    created_at: b.start_at,
    updated_at: b.start_at,
  }));
}
