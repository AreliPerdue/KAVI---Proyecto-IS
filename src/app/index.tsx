import { Redirect } from 'expo-router';

import { useAuth } from '@/providers';

/** Punto de entrada: redirige según sesión (RF-A5). */
export default function IndexScreen() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(app)/(tabs)/calendar' : '/(auth)/login'} />;
}
