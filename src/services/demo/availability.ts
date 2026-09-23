import type { AvailabilityApi } from '@/services/contracts';
import { delay, demoState } from '@/services/demo/store';
import type { AvailabilityBlock } from '@/types/domain';

/** Equivalente a la RPC get_availability: nunca expone título si la visibilidad es busy (P4). */
export const demoAvailability: AvailabilityApi = {
  async getAvailability(userId, userIds, fromIso, toIso) {
    await delay();
    const blocks: AvailabilityBlock[] = [];
    for (const targetId of userIds) {
      const isMe = targetId === userId;
      const share = demoState.calendarShares.find((s) => s.owner_id === targetId && s.shared_with_id === userId);
      if (!isMe && !share) continue;
      const conNivelDetalle = isMe || share?.visibility === 'details';
      for (const a of demoState.activities) {
        if (a.owner_id !== targetId || !(a.start_at < toIso && a.end_at > fromIso)) continue;

        /**
         * La visibilidad de la actividad solo restringe: el nivel del calendario es
         * el techo (RF-C14). Elegir a alguien en una actividad no le enseña el
         * título si no le compartes el calendario con detalles.
         */
        //  cubre las filas creadas antes de existir la columna.
        const visibilidad = a.visibility ?? 'default';
        const laActividadLoPermite =
          visibilidad === 'default' ||
          (visibilidad === 'selected' &&
            demoState.activityViewers.some((v) => v.activity_id === a.id && v.user_id === userId));
        const verDetalle = isMe || (conNivelDetalle && laActividadLoPermite);

        blocks.push({
          user_id: targetId,
          start_at: a.start_at,
          end_at: a.end_at,
          title: verDetalle ? a.title : null,
          color: verDetalle ? a.color : null,
        });
      }
    }
    return blocks.sort((a, b) => a.start_at.localeCompare(b.start_at));
  },
};
