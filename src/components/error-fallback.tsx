import { type ErrorBoundaryProps } from 'expo-router';

import { ErrorState, Screen } from '@/components/ui';

/** Pantalla de error de una ruta (NFR-11): mensaje claro y reintento, sin pantalla en blanco. */
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const message = error.message || 'Algo salió mal.';
  return (
    <Screen>
      <ErrorState message={`Algo salió mal: ${message}`} onRetry={() => void retry()} />
    </Screen>
  );
}
