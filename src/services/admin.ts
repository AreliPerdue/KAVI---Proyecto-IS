/** Fachada del panel de administración (spec 09). */
import { adminApi } from '@/services/backend';
import type { AdminAccount, AdminStats } from '@/types/domain';

export function getAdminStats(): Promise<AdminStats> {
  return adminApi.getStats();
}

export function listAdminAccounts(): Promise<AdminAccount[]> {
  return adminApi.listAccounts();
}
