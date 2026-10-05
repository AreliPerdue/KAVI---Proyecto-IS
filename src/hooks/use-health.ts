import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfDay } from 'date-fns';
import { useState } from 'react';

import { healthApi, type DailyTotals, type ExternalSession, type HealthAvailability, type HealthMetric, type HealthPermissions } from '@/services/health';

/**
 * Datos de actividad de la plataforma de salud (spec 11). Viven solo en la caché de esta
 * sesión de la app (decisión S4): nada se guarda en el servidor y "Desconectar" los borra.
 */
export const healthKeys = {
  all: ['health'] as const,
  availability: ['health', 'availability'] as const,
  permissions: ['health', 'permissions'] as const,
  totals: (from: string, to: string) => ['health', 'totals', from, to] as const,
  sessions: (from: string, to: string) => ['health', 'sessions', from, to] as const,
};

export function useHealthAvailability() {
  return useQuery<HealthAvailability>({ queryKey: healthKeys.availability, queryFn: () => healthApi.availability(), staleTime: Infinity });
}

export function useHealthPermissions(enabled = true) {
  return useQuery<HealthPermissions>({ queryKey: healthKeys.permissions, queryFn: () => healthApi.permissions(), enabled });
}

/** Algún permiso concedido: ya hay algo que mostrar. */
export const anyPermission = (p: HealthPermissions | undefined) => !!p && Object.values(p).some(Boolean);

/** Los últimos `days` días, hoy incluido. El rango se fija al montar. */
function useRango(days: number) {
  const [rango] = useState(() => {
    const hoy = startOfDay(new Date());
    return { from: addDays(hoy, -(days - 1)), to: hoy, end: addDays(hoy, 1) };
  });
  return rango;
}

export function useDailyTotals(days: number, enabled: boolean) {
  const r = useRango(days);
  const from = format(r.from, 'yyyy-MM-dd');
  const to = format(r.to, 'yyyy-MM-dd');
  return useQuery<DailyTotals[]>({ queryKey: healthKeys.totals(from, to), queryFn: () => healthApi.dailyTotals(from, to), enabled, staleTime: 60_000 });
}

export function useExternalSessions(days: number, enabled: boolean) {
  const r = useRango(days);
  const from = r.from.toISOString();
  const to = r.end.toISOString();
  return useQuery<ExternalSession[]>({ queryKey: healthKeys.sessions(from, to), queryFn: () => healthApi.exerciseSessions(from, to), enabled, staleTime: 60_000 });
}

export function useHealthConnection() {
  const qc = useQueryClient();
  return {
    connect: useMutation({
      mutationFn: (metrics: readonly HealthMetric[]) => healthApi.requestPermissions(metrics),
      onSuccess: (p) => {
        qc.setQueryData(healthKeys.permissions, p);
        void qc.invalidateQueries({ queryKey: healthKeys.all });
      },
    }),
    /** RF-H8: olvida lo leído y los permisos; lo de la plataforma no queda en el dispositivo. */
    disconnect: useMutation({
      mutationFn: () => healthApi.disconnect(),
      onSuccess: () => {
        qc.removeQueries({ queryKey: ['health', 'totals'] });
        qc.removeQueries({ queryKey: ['health', 'sessions'] });
        void qc.invalidateQueries({ queryKey: healthKeys.permissions });
      },
    }),
  };
}
