import { type ErrorBoundaryProps } from 'expo-router';

import { ErrorState, Screen } from '@/components/ui';
import { useT } from '@/i18n';

/** Pantalla de error de una ruta (NFR-11): mensaje claro y reintento, sin pantalla en blanco. */
export function ErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const tx = useT();
  const message = error.message || tx.common.somethingWrong;
  return (
    <Screen>
      <ErrorState message={tx.common.somethingWrongWith(message)} onRetry={() => void retry()} />
    </Screen>
  );
}
