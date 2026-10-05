/**
 * Fachada de datos de salud (spec 11). Como el resto de `services/`, los componentes no hablan
 * con la plataforma directo. En modo demo, datos de ejemplo; si no, la implementación de la
 * plataforma (Metro elige `platform.web.ts` en web, `platform.android.ts` en Android y `platform.ts` en iOS).
 */
import { env } from '@/lib/env';

import { demoHealth } from './demo';
import { platformHealth } from './platform';
import type { HealthApi } from './types';

/**
 * `EXPO_PUBLIC_HEALTH_SOURCE=platform` usa la plataforma real aun en modo demo: es para probar Health
 * Connect en un teléfono o emulador sin tocar la base real (T261). En web no cambia nada.
 */
const usarPlataforma = process.env.EXPO_PUBLIC_HEALTH_SOURCE === 'platform';

export const healthApi: HealthApi = env.isDemoMode && !usarPlataforma ? demoHealth : platformHealth;

export * from './types';
