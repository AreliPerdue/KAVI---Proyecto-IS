/**
 * Fachada de datos de salud (spec 11). Como el resto de `services/`, los componentes no hablan
 * con la plataforma directo. En modo demo, datos de ejemplo; si no, la implementación de la
 * plataforma (Metro elige `platform.web.ts`, y `platform.ts` en iOS y Android).
 */
import { env } from '@/lib/env';

import { demoHealth } from './demo';
import { platformHealth } from './platform';
import type { HealthApi } from './types';

export const healthApi: HealthApi = env.isDemoMode ? demoHealth : platformHealth;

export * from './types';
