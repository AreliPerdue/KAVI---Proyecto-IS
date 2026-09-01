import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { LoginValues, RegisterValues } from '@/lib/schemas/auth';
import { resetPassword, signIn, signOut, signUp } from '@/services/auth';

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
