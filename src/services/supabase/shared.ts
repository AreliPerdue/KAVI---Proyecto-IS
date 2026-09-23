import { AuthUiError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase';
import type { AvailabilityApi, ConnectionsApi, RealtimeApi, SharesApi } from '@/services/contracts';
import { toError, unwrap } from '@/services/supabase/errors';
import type {
  ActivityInvitation,
  ActivityShare,
  AvailabilityBlock,
  CalendarVisibility,
  Connection,
  Contact,
  Profile,
} from '@/types/domain';

export const supabaseConnections: ConnectionsApi = {
  /**
   * RF-S1 · Username por prefijo o correo exacto, vía RPC. El correo vive en `auth.users`,
   * que el cliente no puede leer, y sigue exigiendo la cadena completa: aceptar prefijos
   * ahí convertiría el buscador en una herramienta para cosechar direcciones. El username
   * es un identificador público, así que por prefijo no revela nada no publicado.
   */
  async searchUsers(_userId, query) {
    const term = query.trim();
    if (term.replace(/^@+/, '').length === 0) return [];
    const { data, error } = await getSupabase().rpc('search_profiles', { p_query: term, p_limit: 8 });
    if (error) throw toError(error);
    return (data ?? []) as Profile[];
  },

  async listContacts(userId) {
    const db = getSupabase();
    // La RLS ya limita cada consulta a lo mío; se juntan en memoria para una sola pasada.
    const [connections, shares, colors] = await Promise.all([
      db.from('connections').select('*, requester:profiles!connections_requester_id_fkey(*), addressee:profiles!connections_addressee_id_fkey(*)'),
      db.from('calendar_shares').select('owner_id,shared_with_id,visibility'),
      db.from('contact_colors').select('contact_id,color').eq('owner_id', userId),
    ]);
    const rows = unwrap(connections) as unknown as (Connection & {
      requester: Profile;
      addressee: Profile;
    })[];
    const shareRows = unwrap(shares) as {
      owner_id: string;
      shared_with_id: string;
      visibility: CalendarVisibility;
    }[];
    const colorRows = unwrap(colors) as { contact_id: string; color: string }[];

    return rows
      .map<Contact>((row) => {
        const { requester, addressee, ...connection } = row;
        const isMine = connection.requester_id === userId;
        const profile = isMine ? addressee : requester;
        return {
          connection,
          profile,
          kind: connection.status === 'accepted' ? 'accepted' : isMine ? 'outgoing' : 'incoming',
          myCalendarVisibility:
            shareRows.find((s) => s.owner_id === userId && s.shared_with_id === profile.id)?.visibility ?? null,
          theirCalendarVisibility:
            shareRows.find((s) => s.owner_id === profile.id && s.shared_with_id === userId)?.visibility ?? null,
          color: colorRows.find((c) => c.contact_id === profile.id)?.color ?? null,
        };
      })
      .sort((a, b) =>
        (a.profile.display_name ?? a.profile.username).localeCompare(b.profile.display_name ?? b.profile.username),
      );
  },

  async request(userId, addresseeId) {
    if (userId === addresseeId) throw new AuthUiError('No puedes enviarte una solicitud a ti mismo.');
    const { error } = await getSupabase()
      .from('connections')
      .insert({ requester_id: userId, addressee_id: addresseeId });
    // El índice único del par cubre las dos direcciones (A→B y B→A).
    if (error?.code === '23505') {
      throw new AuthUiError('Ya hay una solicitud o un contacto entre ustedes.', error);
    }
    if (error) throw toError(error);
  },

  /** Solo el destinatario puede aceptar: lo impone `connections_update_addressee`. */
  async accept(userId, connectionId) {
    const { data, error } = await getSupabase()
      .from('connections')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('addressee_id', userId)
      .select('id');
    if (error) throw toError(error);
    if (!data || data.length === 0) throw new AuthUiError('Esa solicitud ya no está disponible.');
  },

  /**
   * RF-S2 · Rechazar o eliminar el contacto. Los shares en ambos sentidos los revoca
   * el trigger `connections_revoke_shares`, no este código: el cliente no puede borrar
   * el share que la otra persona creó hacia él (su RLS solo deja tocar los propios).
   */
  async remove(_userId, connectionId) {
    const { error } = await getSupabase().from('connections').delete().eq('id', connectionId);
    if (error) throw toError(error);
  },

  /** RF-S7 · `null` = dejar de compartir. El check de la BD exige contacto aceptado. */
  async setCalendarVisibility(userId, contactUserId, visibility) {
    const db = getSupabase();
    if (!visibility) {
      const { error } = await db
        .from('calendar_shares')
        .delete()
        .eq('owner_id', userId)
        .eq('shared_with_id', contactUserId);
      if (error) throw toError(error);
      return;
    }
    const { error } = await db
      .from('calendar_shares')
      .upsert({ owner_id: userId, shared_with_id: contactUserId, visibility }, { onConflict: 'owner_id,shared_with_id' });
    if (error) throw toError(error);
  },

  /** RF-S15 · `null` vuelve a automático, así que se borra la fila en vez de guardarla. */
  async setContactColor(userId, contactUserId, color) {
    const db = getSupabase();
    if (!color) {
      const { error } = await db
        .from('contact_colors')
        .delete()
        .eq('owner_id', userId)
        .eq('contact_id', contactUserId);
      if (error) throw toError(error);
      return;
    }
    const { error } = await db
      .from('contact_colors')
      .upsert({ owner_id: userId, contact_id: contactUserId, color }, { onConflict: 'owner_id,contact_id' });
    if (error) throw toError(error);
  },
};

export const supabaseShares: SharesApi = {
  /** RF-S4 · Quién tiene la actividad y en qué estado. La RLS deja verlo al dueño. */
  async listByActivity(activityId) {
    const rows = unwrap(
      await getSupabase()
        .from('activity_shares')
        .select('*, profile:profiles!activity_shares_shared_with_id_fkey(*)')
        .eq('activity_id', activityId),
    ) as unknown as (ActivityShare & { profile: Profile })[];
    return rows;
  },

  /** Reinvitar a quien rechazó vuelve a dejar el share en pendiente. */
  async shareActivity(_userId, activityId, contactUserIds) {
    if (contactUserIds.length === 0) return;
    const { error } = await getSupabase().from('activity_shares').upsert(
      contactUserIds.map((shared_with_id) => ({ activity_id: activityId, shared_with_id, status: 'pending' })),
      { onConflict: 'activity_id,shared_with_id' },
    );
    if (error) throw toError(error);
  },

  /** RF-S5 · Invitaciones pendientes con lo necesario para pintarlas. */
  async listInvitations(userId) {
    const rows = unwrap(
      await getSupabase()
        .from('activity_shares')
        .select('*, activity:activities!inner(*, owner:profiles!activities_owner_id_fkey(*))')
        .eq('shared_with_id', userId)
        .eq('status', 'pending'),
    ) as unknown as (ActivityShare & {
      activity: ActivityInvitation['activity'] & { owner: Profile };
    })[];

    return rows
      .map<ActivityInvitation>(({ activity, ...share }) => {
        const { owner, ...rest } = activity;
        return { share, activity: rest, owner };
      })
      .sort((a, b) => a.activity.start_at.localeCompare(b.activity.start_at));
  },

  /** Aceptar hereda los recordatorios existentes: lo hace el trigger de activity_shares. */
  async respond(userId, shareId, respuesta) {
    const { data, error } = await getSupabase()
      .from('activity_shares')
      .update({ status: respuesta })
      .eq('id', shareId)
      .eq('shared_with_id', userId)
      .select('id');
    if (error) throw toError(error);
    if (!data || data.length === 0) throw new AuthUiError('Esa invitación ya no está disponible.');
  },

  /** RF-S6 · Salirse o (dueño) revocar. La RLS ya permite ambos casos y nada más. */
  async removeShare(_userId, shareId) {
    const db = getSupabase();
    const { data: share } = await db
      .from('activity_shares')
      .select('activity_id')
      .eq('id', shareId)
      .maybeSingle();
    const { error } = await db.from('activity_shares').delete().eq('id', shareId);
    if (error) throw toError(error);
    // Quien deja de estar invitado deja de recibir los recordatorios de esa actividad.
    if (share) await db.rpc('add_reminder_recipients', { p_activity: share.activity_id });
  },
};

export const supabaseAvailability: AvailabilityApi = {
  /**
   * RF-S8 · Vía RPC y no leyendo `activities`: con visibilidad `busy` esas filas no son
   * visibles por RLS, y la función solo devuelve inicio/fin (el título llega vacío).
   */
  async getAvailability(_userId, userIds, fromIso, toIso) {
    if (userIds.length === 0) return [];
    const { data, error } = await getSupabase().rpc('get_availability', {
      p_user_ids: userIds,
      p_from: fromIso,
      p_to: toIso,
    });
    if (error) throw toError(error);
    return (data ?? []) as AvailabilityBlock[];
  },
};

/** Tablas cuyos cambios pueden alterar lo que veo en pantalla (RF-S14). */
const WATCHED = [
  'activities',
  'activity_shares',
  'calendar_shares',
  'connections',
  'reminders',
  'reminder_recipients',
] as const;

export const supabaseRealtime: RealtimeApi = {
  /**
   * Un solo canal para todas las tablas. No se filtra por usuario a propósito: la RLS
   * ya decide qué eventos llegan, y `onChange` solo invalida cache — nunca transporta
   * datos, así que lo peor que puede pasar es una recarga de más.
   */
  subscribe(userId, onChange) {
    const channel = getSupabase().channel(`kavi:${userId}`);
    for (const table of WATCHED) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
    }
    channel.subscribe();
    return () => {
      getSupabase().removeChannel(channel);
    };
  },
};
