import type { AvailabilityApi, ConnectionsApi, RealtimeApi, SharesApi } from '@/services/contracts';
import { notImplemented } from '@/services/supabase/not-implemented';

/** Fase 8 (T031/T032): connections, calendar_shares, activity_shares, RPC get_availability y Realtime. */
export const supabaseConnections: ConnectionsApi = {
  searchUsers: () => notImplemented('connections.searchUsers'),
  listContacts: () => notImplemented('connections.listContacts'),
  request: () => notImplemented('connections.request'),
  accept: () => notImplemented('connections.accept'),
  remove: () => notImplemented('connections.remove'),
  setCalendarVisibility: () => notImplemented('connections.setCalendarVisibility'),
  setContactColor: () => notImplemented('connections.setContactColor'),
};

export const supabaseShares: SharesApi = {
  listByActivity: () => notImplemented('shares.listByActivity'),
  shareActivity: () => notImplemented('shares.shareActivity'),
  listInvitations: async () => [],
  respond: () => notImplemented('shares.respond'),
  removeShare: () => notImplemented('shares.removeShare'),
};

export const supabaseAvailability: AvailabilityApi = {
  getAvailability: () => notImplemented('availability.getAvailability'),
};

export const supabaseRealtime: RealtimeApi = {
  subscribe: () => () => {},
};
