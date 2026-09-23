import { AuthUiError } from '@/lib/auth-errors';
import type { SharesApi } from '@/services/contracts';
import { areConnected, profileOf } from '@/services/demo/connections';
import { syncRecipients } from '@/services/demo/reminders';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';

export const demoShares: SharesApi = {
  async listByActivity(activityId) {
    await delay(100);
    return demoState.activityShares
      .filter((s) => s.activity_id === activityId)
      .map((s) => ({ ...s, profile: profileOf(s.shared_with_id) }));
  },

  async shareActivity(userId, activityId, contactUserIds) {
    await delay();
    const activity = demoState.activities.find((a) => a.id === activityId);
    if (!activity || activity.owner_id !== userId) throw new AuthUiError('Solo quien creó la actividad puede compartirla.');
    for (const contactId of contactUserIds) {
      if (!areConnected(userId, contactId)) throw new AuthUiError('Solo puedes compartir con contactos aceptados.');
      const existing = demoState.activityShares.find((s) => s.activity_id === activityId && s.shared_with_id === contactId);
      if (existing) {
        if (existing.status === 'declined') existing.status = 'pending';
        continue;
      }
      demoState.activityShares.push({ id: nextId('as'), activity_id: activityId, shared_with_id: contactId, status: 'pending', created_at: new Date().toISOString() });
    }
    emitDataChange();
  },

  async listInvitations(userId) {
    await delay();
    return demoState.activityShares
      .filter((s) => s.shared_with_id === userId && s.status === 'pending')
      .flatMap((share) => {
        const activity = demoState.activities.find((a) => a.id === share.activity_id);
        if (!activity) return [];
        return [{ share: { ...share }, activity: { ...activity }, owner: profileOf(activity.owner_id) }];
      })
      .sort((a, b) => a.activity.start_at.localeCompare(b.activity.start_at));
  },

  async respond(userId, shareId, respuesta) {
    await delay();
    const share = demoState.activityShares.find((s) => s.id === shareId && s.shared_with_id === userId);
    if (!share) throw new AuthUiError('Esa invitación ya no está disponible.');
    share.status = respuesta;
    /**
     * Los recordatorios se heredan al confirmar y también al responder «tal vez»
     * (RF-S10, RF-S19): quien duda es justamente quien más necesita el aviso para
     * decidir a tiempo.
     */
    if (respuesta !== 'declined') syncRecipients(share.activity_id);
    emitDataChange();
  },

  async removeShare(userId, shareId) {
    await delay();
    const share = demoState.activityShares.find((s) => s.id === shareId);
    if (!share) return;
    const activity = demoState.activities.find((a) => a.id === share.activity_id);
    const allowed = share.shared_with_id === userId || activity?.owner_id === userId;
    if (!allowed) throw new AuthUiError('No puedes modificar ese share.');
    demoState.activityShares = demoState.activityShares.filter((s) => s.id !== shareId);
    const reminderIds = new Set(demoState.reminders.filter((r) => r.activity_id === share.activity_id).map((r) => r.id));
    demoState.recipients = demoState.recipients.filter((r) => !(reminderIds.has(r.reminder_id) && r.user_id === share.shared_with_id));
    emitDataChange();
  },
};
