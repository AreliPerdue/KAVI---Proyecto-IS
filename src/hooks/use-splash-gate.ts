import { useEffect, useState } from 'react';

import { SplashMinDuration } from '@/constants/theme';

/**
 * Arranque del JS. El mínimo se cuenta desde aquí y no desde el montaje, así el
 * tiempo que el splash nativo ya llevaba en pantalla suma al total y el piso es
 * el mismo en las tres plataformas.
 */
const startedAt = Date.now();

/**
 * Decide si el splash sigue en pantalla: mientras se restaura la sesión y, como
 * mínimo, `SplashMinDuration` desde el arranque (NFR-19). La sesión casi siempre
 * se restaura antes; el piso existe para que la marca alcance a leerse.
 */
export function useSplashGate(isRestoringSession: boolean): boolean {
  const [minElapsed, setMinElapsed] = useState(() => Date.now() - startedAt >= SplashMinDuration);

  useEffect(() => {
    if (minElapsed) return;
    const id = setTimeout(
      () => setMinElapsed(true),
      SplashMinDuration - (Date.now() - startedAt),
    );
    return () => clearTimeout(id);
  }, [minElapsed]);

  return isRestoringSession || !minElapsed;
}
