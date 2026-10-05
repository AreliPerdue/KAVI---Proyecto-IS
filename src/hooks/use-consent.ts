import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PRIVACY_VERSION } from '@/constants/privacy';
import { olvidarDatosDelDispositivo } from '@/hooks/use-auth-actions';
import { type ConsentGate, consentGate } from '@/lib/consent';
import { toDayKey } from '@/lib/dates';
import { storage } from '@/lib/storage';
import { useAuth } from '@/providers';
import {
  acceptPrivacy,
  decideGuardianRequest,
  deleteUnderageAccount,
  getConsentStatus,
  guardianRequestInfo,
  requestGuardianApproval,
} from '@/services/consent';

const CLAVE = ['consent'] as const;

/**
 * Qué le toca a la cuenta antes de abrir la app (RF-A13).
 *
 * Una cuenta que ya pasó queda recordada en el dispositivo con la versión del aviso: sin eso,
 * abrir KAVI sin conexión dejaría fuera a todo el mundo, y KAVI funciona sin red. Lo recordado
 * solo vale si la consulta falla; con red, manda siempre el servidor.
 */
async function cargarGate(userId: string): Promise<ConsentGate> {
  const recordado = `kavi.consent.${userId}`;
  try {
    const gate = consentGate(await getConsentStatus(), PRIVACY_VERSION, toDayKey(new Date()));
    if (gate.kind === 'listo') await storage.setItem(recordado, PRIVACY_VERSION);
    else await storage.removeItem(recordado);
    return gate;
  } catch (error) {
    if ((await storage.getItem(recordado)) === PRIVACY_VERSION) return { kind: 'listo' };
    throw error;
  }
}

export function useConsentGate() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: [...CLAVE, userId],
    queryFn: () => cargarGate(userId as string),
    enabled: !!userId,
    // Mientras se espera al adulto, la app revisa sola si ya aprobó.
    refetchInterval: (query) => {
      const gate = query.state.data;
      return gate?.kind === 'adulto-responsable' && gate.request?.status === 'pending' ? 15_000 : false;
    },
  });
}

export function useAcceptPrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (birthDate: string) => acceptPrivacy(birthDate, PRIVACY_VERSION),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

export function useRequestGuardianApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => requestGuardianApproval(email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLAVE }),
  });
}

/** Menores de 16 (RF-A13): la cuenta se elimina con la sesión actual. */
export function useDeleteUnderageAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUnderageAccount,
    onSuccess: () => olvidarDatosDelDispositivo(queryClient),
  });
}

/** Página pública del adulto: no depende de la sesión. */
export function useGuardianRequest(token: string | null) {
  return useQuery({
    queryKey: ['guardian-request', token],
    queryFn: () => guardianRequestInfo(token as string),
    enabled: !!token,
  });
}

export function useDecideGuardianRequest(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (approve: boolean) => decideGuardianRequest(token as string, approve),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['guardian-request', token] });
      // Si quien aprueba abre el enlace en el mismo aparato (siempre en demo), la app se abre sin esperar.
      await queryClient.invalidateQueries({ queryKey: CLAVE });
    },
  });
}
