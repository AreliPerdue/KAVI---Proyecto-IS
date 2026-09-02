import { AUTH_MESSAGES, AuthUiError } from '@/lib/auth-errors';
import type { ConnectionsApi } from '@/services/contracts';
import { delay, demoState, emitDataChange, nextId } from '@/services/demo/store';
import type { Contact, Profile } from '@/types/domain';

export function profileOf(userId: string): Profile {
  const account = demoState.accounts.find((a) => a.user.id === userId);
  if (!account) throw new AuthUiError(AUTH_MESSAGES.generic);
  return { ...account.profile };
}

export function areConnected(a: string, b: string): boolean {
  return demoState.connections.some(
    (c) => c.status === 'accepted' && ((c.requester_id === a && c.addressee_id === b) || (c.requester_id === b && c.addressee_id === a)),
  );
}

/** Revoca todos los shares entre dos personas (RF-S2, cascada en servicio). */
function revokeSharesBetween(a: string, b: string) {
  demoState.calendarShares = demoState.calendarShares.filter(
    (s) => !((s.owner_id === a && s.shared_with_id === b) || (s.owner_id === b && s.shared_with_id === a)),
  );
  const ownerOf = (activityId: string) => demoState.activities.find((x) => x.id === activityId)?.owner_id;
  demoState.activityShares = demoState.activityShares.filter((s) => {
    const owner = ownerOf(s.activity_id);
    return !((owner === a && s.shared_with_id === b) || (owner === b && s.shared_with_id === a));
  });
  demoState.recipients = demoState.recipients.filter((r) => {
    const reminder = demoState.reminders.find((x) => x.id === r.reminder_id);
    const owner = reminder ? ownerOf(reminder.activity_id) : undefined;
    return !((owner === a && r.user_id === b) || (owner === b && r.user_id === a));
  });
}

export const demoConnections: ConnectionsApi = {
  async searchUsers(userId, query) {
    await delay(150);
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    return demoState.accounts
      .filter((a) => a.user.id !== userId && a.profile.username.startsWith(q))
      .map((a) => ({ ...a.profile }));
  },

  async listContacts(userId) {
    await delay();
    return demoState.connections
      .filter((c) => c.requester_id === userId || c.addressee_id === userId)
      .map<Contact>((c) => {
        const otherId = c.requester_id === userId ? c.addressee_id : c.requester_id;
        const kind = c.status === 'accepted' ? 'accepted' : c.addressee_id === userId ? 'incoming' : 'outgoing';
        return {
          connection: { ...c },
          profile: profileOf(otherId),
          kind,
          myCalendarVisibility: demoState.calendarShares.find((s) => s.owner_id === userId && s.shared_with_id === otherId)?.visibility ?? null,
          theirCalendarVisibility: demoState.calendarShares.find((s) => s.owner_id === otherId && s.shared_with_id === userId)?.visibility ?? null,
        };
      })
      .sort((a, b) => (a.profile.display_name ?? a.profile.username).localeCompare(b.profile.display_name ?? b.profile.username));
  },

  async request(userId, addresseeId) {
    await delay();
    if (userId === addresseeId) throw new AuthUiError('No puedes enviarte una solicitud a ti mismo.');
    const exists = demoState.connections.find(
      (c) => (c.requester_id === userId && c.addressee_id === addresseeId) || (c.requester_id === addresseeId && c.addressee_id === userId),
    );
    if (exists) throw new AuthUiError(exists.status === 'accepted' ? 'Ya son contactos.' : 'Ya hay una solicitud pendiente entre ustedes.');
    demoState.connections.push({ id: nextId('con'), requester_id: userId, addressee_id: addresseeId, status: 'pending', created_at: new Date().toISOString(), responded_at: null });
    emitDataChange();
  },

  async accept(userId, connectionId) {
    await delay();
    const connection = demoState.connections.find((c) => c.id === connectionId);
    if (!connection || connection.addressee_id !== userId) throw new AuthUiError('Esa solicitud ya no está disponible.');
    connection.status = 'accepted';
    connection.responded_at = new Date().toISOString();
    emitDataChange();
  },

  async remove(userId, connectionId) {
    await delay();
    const connection = demoState.connections.find((c) => c.id === connectionId);
    if (!connection || (connection.requester_id !== userId && connection.addressee_id !== userId)) return;
    const otherId = connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
    demoState.connections = demoState.connections.filter((c) => c.id !== connectionId);
    revokeSharesBetween(userId, otherId);
    emitDataChange();
  },

  async setCalendarVisibility(userId, contactUserId, visibility) {
    await delay();
    if (visibility && !areConnected(userId, contactUserId)) throw new AuthUiError('Solo puedes compartir tu calendario con contactos aceptados.');
    demoState.calendarShares = demoState.calendarShares.filter((s) => !(s.owner_id === userId && s.shared_with_id === contactUserId));
    if (visibility) {
      demoState.calendarShares.push({ id: nextId('cs'), owner_id: userId, shared_with_id: contactUserId, visibility, created_at: new Date().toISOString() });
    }
    emitDataChange();
  },
};
