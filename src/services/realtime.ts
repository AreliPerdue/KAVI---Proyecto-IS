/** Suscripción a cambios (RF-S14). Fachada sobre el backend activo. */
import { realtimeApi } from '@/services/backend';

export const subscribeToChanges = realtimeApi.subscribe;
