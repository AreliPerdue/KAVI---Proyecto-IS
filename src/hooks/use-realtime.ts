import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { invalidateSharedData } from '@/lib/query-invalidation';
import { useAuth } from '@/providers';
import { subscribeToChanges } from '@/services/realtime';

/** Invalida la cache cuando el backend avisa de cambios que me afectan (RF-S14, plan §3.3). */
export function useRealtimeInvalidation() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToChanges(userId, () => {
      // Agrupa ráfagas de cambios en una sola invalidación.
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        invalidateSharedData(queryClient);
      }, 50);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [userId, queryClient]);
}
