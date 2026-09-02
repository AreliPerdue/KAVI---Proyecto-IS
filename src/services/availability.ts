/** Disponibilidad (RF-S8, RF-S9). Fachada sobre el backend activo. */
import { availabilityApi } from '@/services/backend';

export type { AvailabilityBlock } from '@/types/domain';

export const getAvailability = availabilityApi.getAvailability;
