/** Conexiones y calendario compartido (RF-S1–S3, RF-S7). Fachada sobre el backend activo. */
import { connectionsApi } from '@/services/backend';

export type { CalendarVisibility, Contact } from '@/types/domain';

export const searchUsers = connectionsApi.searchUsers;
export const listContacts = connectionsApi.listContacts;
export const requestConnection = connectionsApi.request;
export const acceptConnection = connectionsApi.accept;
export const removeConnection = connectionsApi.remove;
export const setCalendarVisibility = connectionsApi.setCalendarVisibility;
export const setContactColor = connectionsApi.setContactColor;
