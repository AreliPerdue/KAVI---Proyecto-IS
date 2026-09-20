import { useQuery } from '@tanstack/react-query';

import { useMyProfile } from '@/hooks/use-profile';
import { getAdminStats, listAdminAccounts } from '@/services/admin';

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  accounts: ['admin', 'accounts'] as const,
};

/**
 * ¿Esta cuenta administra KAVI? (RF-AD1). Es solo para decidir qué pintar: el control
 * de acceso real vive en la base, que rechaza las funciones a quien no tiene el rol.
 */
export function useIsAdmin(): boolean {
  return useMyProfile().data?.role === 'adminkavi';
}

export function useAdminStats() {
  const isAdmin = useIsAdmin();
  return useQuery({ queryKey: adminKeys.stats, queryFn: getAdminStats, enabled: isAdmin });
}

export function useAdminAccounts() {
  const isAdmin = useIsAdmin();
  return useQuery({ queryKey: adminKeys.accounts, queryFn: listAdminAccounts, enabled: isAdmin });
}
