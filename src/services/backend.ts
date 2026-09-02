/**
 * Selección del backend (NFR-6): Supabase en producción, memoria en modo demo.
 * Hooks y UI solo importan las fachadas services/*.ts, nunca las implementaciones.
 */
import { env } from '@/lib/env';
import type {
  ActivitiesApi,
  AuthApi,
  AvailabilityApi,
  ConnectionsApi,
  ProfilesApi,
  RealtimeApi,
  RemindersApi,
  SharesApi,
  ThemesApi,
} from '@/services/contracts';
import { demoActivities } from '@/services/demo/activities';
import { demoAuth } from '@/services/demo/auth';
import { demoAvailability } from '@/services/demo/availability';
import { demoConnections } from '@/services/demo/connections';
import { demoRealtime } from '@/services/demo/realtime';
import { demoShares } from '@/services/demo/shares';
import { demoProfiles } from '@/services/demo/profiles';
import { demoReminders } from '@/services/demo/reminders';
import { demoThemes } from '@/services/demo/themes';
import { supabaseActivities } from '@/services/supabase/activities';
import { supabaseAuth } from '@/services/supabase/auth';
import { supabaseProfiles } from '@/services/supabase/profiles';
import { supabaseReminders } from '@/services/supabase/reminders';
import { supabaseAvailability, supabaseConnections, supabaseRealtime, supabaseShares } from '@/services/supabase/shared';
import { supabaseThemes } from '@/services/supabase/themes';

export const authApi: AuthApi = env.isDemoMode ? demoAuth : supabaseAuth;
export const profilesApi: ProfilesApi = env.isDemoMode ? demoProfiles : supabaseProfiles;
export const activitiesApi: ActivitiesApi = env.isDemoMode ? demoActivities : supabaseActivities;
export const themesApi: ThemesApi = env.isDemoMode ? demoThemes : supabaseThemes;
export const remindersApi: RemindersApi = env.isDemoMode ? demoReminders : supabaseReminders;
export const connectionsApi: ConnectionsApi = env.isDemoMode ? demoConnections : supabaseConnections;
export const sharesApi: SharesApi = env.isDemoMode ? demoShares : supabaseShares;
export const availabilityApi: AvailabilityApi = env.isDemoMode ? demoAvailability : supabaseAvailability;
export const realtimeApi: RealtimeApi = env.isDemoMode ? demoRealtime : supabaseRealtime;
