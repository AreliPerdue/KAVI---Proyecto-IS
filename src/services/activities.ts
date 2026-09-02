/** Actividades (spec 04): CRUD + consulta por rango. Fachada sobre el backend activo. */
import { activitiesApi } from '@/services/backend';

export type { CreateActivityInput, RecurrenceScope } from '@/services/contracts';
export type { Activity, ActivityInput } from '@/types/domain';

export const listActivitiesByRange = activitiesApi.listByRange;
export const getActivity = activitiesApi.getById;
export const createActivity = activitiesApi.create;
export const updateActivity = activitiesApi.update;
export const removeActivity = activitiesApi.remove;
export const extendRecurrenceHorizon = activitiesApi.extendRecurrenceHorizon;
