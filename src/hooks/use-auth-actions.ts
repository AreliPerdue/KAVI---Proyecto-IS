import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';

import { clearOutbox } from '@/lib/gym/outbox';
import { syncNotifications } from '@/lib/notifications';
import type { LoginValues, RegisterValues } from '@/lib/schemas/auth';
import { useGymStore } from '@/store/gym-store';
import { useOutboxStore } from '@/store/outbox-store';
import {
  changePassword,
  deleteAccount,
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
      mutationFn: ({ email, displayName, username }: { email: string; displayName: string; username: string }) =>
        startEmailSignUp(email, displayName, username),
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

/**
 * Lo que este dispositivo guardaba de la persona: la cola de series pendientes, el descanso en
 * curso, los avisos programados y la caché de datos. Las preferencias del aparato (formato de
 * hora, tema) se quedan. Se usa al eliminar la cuenta (RF-A12, RF-A13).
 */
export async function olvidarDatosDelDispositivo(queryClient: QueryClient): Promise<void> {
  useGymStore.getState().stopRest();
  useOutboxStore.getState().setEntries(() => []);
  await Promise.allSettled([clearOutbox(), syncNotifications([])]);
  queryClient.clear();
}

/** Eliminar cuenta (RF-A12). Además del servidor, se limpia lo que guardaba este dispositivo. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => deleteAccount(email, password),
    onSuccess: () => olvidarDatosDelDispositivo(queryClient),
  });
}
