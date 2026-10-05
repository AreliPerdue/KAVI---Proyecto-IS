import { NO_PERMISSIONS, type HealthApi } from './types';

/**
 * Web: el navegador no tiene acceso a datos de salud. Es la excepción documentada de P5
 * (enmienda del 4 oct 2026): en web, Fitness es el Gym Tracker completo y un aviso.
 */
export const platformHealth: HealthApi = {
  async availability() {
    return { status: 'web', source: null, reason: 'web' };
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
