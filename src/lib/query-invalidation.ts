import type { QueryClient } from '@tanstack/react-query';

/**
 * Todo lo que depende de con quién compartes.
 *
 * Tocar un contacto no cambia solo la lista de contactos: al romper una conexión el
 * backend revoca los shares de calendario y de actividad y las copias de recordatorios
 * (trigger `connections_revoke_shares`), así que el calendario, la disponibilidad y las
 * invitaciones dejan de ser ciertos en el mismo instante. Vive en un único lugar para
 * que quien invalide —una mutación o un aviso de Realtime— no se deje nada fuera.
 */
const SHARED_DATA_KEYS = [
  ['connections'],
  ['activities'],
  ['shares'],
  ['reminders'],
  ['availability'],
] as const;

export function invalidateSharedData(queryClient: QueryClient): void {
  for (const queryKey of SHARED_DATA_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
