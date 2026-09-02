import { useContacts } from '@/hooks/use-connections';
import { useInvitations } from '@/hooks/use-shares';

/** Invitaciones a actividades + solicitudes de conexión recibidas (RF-S5). */
export function useSharedBadgeCount(): number {
  const contacts = useContacts();
  const invitations = useInvitations();
  const incoming = (contacts.data ?? []).filter((c) => c.kind === 'incoming').length;
  return incoming + (invitations.data?.length ?? 0);
}
