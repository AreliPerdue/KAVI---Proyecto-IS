/** Compartir actividades e invitaciones (RF-S4–S6). Fachada sobre el backend activo. */
import { sharesApi } from '@/services/backend';

export type { ActivityInvitation, ActivityShare } from '@/types/domain';

export const listActivityShares = sharesApi.listByActivity;
export const shareActivity = sharesApi.shareActivity;
export const listInvitations = sharesApi.listInvitations;
export const respondInvitation = sharesApi.respond;
export const removeActivityShare = sharesApi.removeShare;
