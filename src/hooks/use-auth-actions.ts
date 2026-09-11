import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { LoginValues, RegisterValues } from '@/lib/schemas/auth';
import {
  changePassword,
  resetPassword,
  setPassword,
  signIn,
  signOut,
  signUp,
  startEmailSignUp,
  verifyEmailOtp,
} from '@/services/auth';

export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: LoginValues) => signIn(email, password),
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: (values: RegisterValues) => signUp(values),
  });
}

/** Alta por pasos (RF-A8): enviar código, verificarlo y fijar la contraseña. */
export function useEmailSignUp() {
  return {
    start: useMutation({
      mutationFn: ({ email, displayName }: { email: string; displayName: string }) =>
        startEmailSignUp(email, displayName),
    }),
    verify: useMutation({
      mutationFn: ({ email, code }: { email: string; code: string }) => verifyEmailOtp(email, code),
    }),
    finish: useMutation({
      mutationFn: (password: string) => setPassword(password),
    }),
  };
}

/** Cambio de contraseña desde Perfil (RF-A9). */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ email, currentPassword, newPassword }: { email: string; currentPassword: string; newPassword: string }) =>
      changePassword(email, currentPassword, newPassword),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) => resetPassword(email),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => queryClient.clear(),
  });
}
