import { useClubs } from '@/hooks/use-clubs';
import { useContacts } from '@/hooks/use-connections';
import { useInvitations } from '@/hooks/use-shares';
import { useAuth } from '@/providers';

/** Invitaciones a actividades y a clubes de lectura (13f, T306) + solicitudes de conexión recibidas (RF-S5). */
export function useSharedBadgeCount(): number {
  const { userId } = useAuth();
  const contacts = useContacts();
  const invitations = useInvitations();
  const clubes = useClubs();
  const incoming = (contacts.data ?? []).filter((c) => c.kind === 'incoming').length;
  const deClub = clubes.members.filter((m) => m.person_id === userId && m.status === 'pending').length;
  return incoming + (invitations.data?.length ?? 0) + deClub;
}
