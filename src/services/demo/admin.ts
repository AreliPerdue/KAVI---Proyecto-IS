import { subDays } from 'date-fns';

import type { AdminApi } from '@/services/contracts';
import { delay, demoState } from '@/services/demo/store';
import type { AdminAccount, AdminStats } from '@/types/domain';

const since = (days: number) => subDays(new Date(), days).toISOString();

/** Equivalente en memoria de `admin_stats()` / `admin_accounts()` (spec 09). */
export const demoAdmin: AdminApi = {
  async getStats(): Promise<AdminStats> {
    await delay();
    const d7 = since(7);
    const d30 = since(30);
    return {
      total_accounts: demoState.accounts.length,
      accounts_7d: demoState.accounts.filter((a) => a.profile.created_at > d7).length,
      accounts_30d: demoState.accounts.filter((a) => a.profile.created_at > d30).length,
      active_users_30d: new Set(
        demoState.activities.filter((a) => a.updated_at > d30).map((a) => a.owner_id),
      ).size,
      total_activities: demoState.activities.length,
      activities_30d: demoState.activities.filter((a) => a.created_at > d30).length,
      accepted_connections: demoState.connections.filter((c) => c.status === 'accepted').length,
      shared_calendars: demoState.calendarShares.length,
      custom_themes: demoState.themes.filter((t) => !t.is_system).length,
      total_workouts: 0,
    };
  },

  async listAccounts(): Promise<AdminAccount[]> {
    await delay();
    return demoState.accounts
      .map<AdminAccount>(({ user, profile }) => {
        const mine = demoState.activities.filter((a) => a.owner_id === user.id);
        return {
          id: user.id,
          email: user.email,
          display_name: profile.display_name,
          role: profile.role,
          created_at: profile.created_at,
          activity_count: mine.length,
          last_active_at: mine.reduce<string | null>(
            (max, a) => (max === null || a.updated_at > max ? a.updated_at : max),
            null,
          ),
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
};
