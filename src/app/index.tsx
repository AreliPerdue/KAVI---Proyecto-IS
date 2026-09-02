import { Redirect } from 'expo-router';

import { env } from '@/lib/env';
import { useAuth } from '@/providers';

/** Punto de entrada: redirige según sesión (RF-A5). */
export default function IndexScreen() {
  const { user } = useAuth();
  if (user && env.isDemoMode && env.demoStartPath.startsWith('/')) {
    // justificación: ruta libre solo en modo demo para capturas/desarrollo.
    return <Redirect href={env.demoStartPath as '/(app)/(tabs)/calendar'} />;
  }
  return <Redirect href={user ? '/(app)/(tabs)/calendar' : '/(auth)/login'} />;
}
