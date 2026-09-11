/** Servicio de autenticación (spec 03). Fachada sobre el backend activo. */
import { authApi } from '@/services/backend';

export type { SignUpInput, SignUpResult } from '@/services/contracts';

export const signUp = authApi.signUp;
export const startEmailSignUp = authApi.startEmailSignUp;
export const verifyEmailOtp = authApi.verifyEmailOtp;
export const setPassword = authApi.setPassword;
export const changePassword = authApi.changePassword;
export const signIn = authApi.signIn;
export const signOut = authApi.signOut;
export const resetPassword = authApi.resetPassword;
export const getSession = authApi.getSession;
export const onAuthStateChange = authApi.onAuthStateChange;
export const isUsernameAvailable = authApi.isUsernameAvailable;
