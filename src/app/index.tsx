import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/providers';
import { usePreferencesStore } from '@/store/preferences-store';

/**
 * Punto de entrada: redirige según sesión (RF-A5).
 *
 * Con sesión abierta se va al calendario, que es la pantalla principal. La única
 * excepción es la primera vez: ahí lleva a Perfil, donde están el Nobi y el
 * cumpleaños, porque un calendario vacío no dice qué hacer a continuación.
 */
export default function IndexScreen() {
  const { user } = useAuth();
  const visto = usePreferencesStore((s) => s.visto);
  const hydrated = usePreferencesStore((s) => s.hydrated);
  const marcarVisto = usePreferencesStore((s) => s.marcarVisto);
  const primeraVez = hydrated && !visto;

  useEffect(() => {
    if (user && primeraVez) marcarVisto();
  }, [user, primeraVez, marcarVisto]);

  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href={primeraVez ? '/(app)/(tabs)/profile' : '/(app)/(tabs)/calendar'} />;
}
