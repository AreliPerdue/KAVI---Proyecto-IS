import { QueryClient } from '@tanstack/react-query';

/** Cliente TanStack Query único (plan §3): cache por rango de fechas y filtros. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
