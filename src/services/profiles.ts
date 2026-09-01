/** Perfil propio (RF-A6). Fachada sobre el backend activo. */
import { profilesApi } from '@/services/backend';

export type { ProfileUpdate } from '@/services/contracts';
export type { Profile } from '@/types/domain';

export const getMyProfile = profilesApi.getMyProfile;
export const updateMyProfile = profilesApi.updateMyProfile;
