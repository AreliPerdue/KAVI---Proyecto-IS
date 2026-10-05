import { NO_PERMISSIONS, type HealthApi } from './types';

/**
 * iOS y Android mientras no haya adaptador (spec 11: Health Connect en T261, HealthKit en T262).
 * Metro elige `platform.web.ts` en web; aquí cae todo lo nativo. Cuando exista
 * `platform.android.ts` o `platform.ios.ts`, ese gana para su plataforma.
 */
export const platformHealth: HealthApi = {
  async availability() {
    return { status: 'unsupported', source: null, message: 'Pronto: KAVI todavía no lee la actividad de este teléfono.' };
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
