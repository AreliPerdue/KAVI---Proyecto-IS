/** Servicio de autenticación (spec 03). Fachada sobre el backend activo. */
import { authApi } from '@/services/backend';

export type { SignUpInput, SignUpResult } from '@/services/contracts';

export const signUp = authApi.signUp;
export const signIn = authApi.signIn;
export const signOut = authApi.signOut;
export const resetPassword = authApi.resetPassword;
export const getSession = authApi.getSession;
export const onAuthStateChange = authApi.onAuthStateChange;
export const isUsernameAvailable = authApi.isUsernameAvailable;
