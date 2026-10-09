import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { invalidateForTables } from '@/lib/query-invalidation';
import { useAuth } from '@/providers';
import { subscribeToChanges } from '@/services/realtime';

/** Invalida la cache cuando el backend avisa de cambios que me afectan (RF-S14, plan §3.3). */
export function useRealtimeInvalidation() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tablas = new Set<string | undefined>();
    const unsubscribe = subscribeToChanges(userId, (table) => {
      // Agrupa ráfagas de cambios en una sola invalidación, con lo que tocó cada tabla.
      tablas.add(table);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const juntas = tablas;
        tablas = new Set();
        invalidateForTables(queryClient, juntas);
      }, 150);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [userId, queryClient]);
}
