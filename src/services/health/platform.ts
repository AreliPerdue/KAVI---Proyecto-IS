import { NO_PERMISSIONS, type HealthApi } from './types';

/**
 * iOS mientras no haya adaptador de HealthKit (spec 11, T262). Metro elige `platform.web.ts` en
 * web y `platform.android.ts` (Health Connect, T261) en Android; aquí solo cae iOS.
 */
export const platformHealth: HealthApi = {
  async availability() {
    return { status: 'unsupported', source: null, reason: 'ios_soon' };
  },
  async permissions() {
    return NO_PERMISSIONS;
  },
  async requestPermissions() {
    return NO_PERMISSIONS;
  },
  async dailyTotals() {
    return [];
  },
  async exerciseSessions() {
    return [];
  },
  async disconnect() {},
};
