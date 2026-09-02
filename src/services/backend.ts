/**
 * Selección del backend (NFR-6): Supabase en producción, memoria en modo demo.
 * Hooks y UI solo importan las fachadas services/*.ts, nunca las implementaciones.
 */
import { env } from '@/lib/env';
import type { ActivitiesApi, AuthApi, ProfilesApi, RemindersApi, ThemesApi } from '@/services/contracts';
import { demoActivities } from '@/services/demo/activities';
import { demoAuth } from '@/services/demo/auth';
import { demoProfiles } from '@/services/demo/profiles';
import { demoReminders } from '@/services/demo/reminders';
import { demoThemes } from '@/services/demo/themes';
import { supabaseActivities } from '@/services/supabase/activities';
import { supabaseAuth } from '@/services/supabase/auth';
import { supabaseProfiles } from '@/services/supabase/profiles';
import { supabaseReminders } from '@/services/supabase/reminders';
import { supabaseThemes } from '@/services/supabase/themes';

export const authApi: AuthApi = env.isDemoMode ? demoAuth : supabaseAuth;
export const profilesApi: ProfilesApi = env.isDemoMode ? demoProfiles : supabaseProfiles;
export const activitiesApi: ActivitiesApi = env.isDemoMode ? demoActivities : supabaseActivities;
export const themesApi: ThemesApi = env.isDemoMode ? demoThemes : supabaseThemes;
export const remindersApi: RemindersApi = env.isDemoMode ? demoReminders : supabaseReminders;
