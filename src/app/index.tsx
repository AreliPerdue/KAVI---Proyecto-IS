import { Redirect } from 'expo-router';

import { useAuth } from '@/providers';

/** Punto de entrada: redirige según sesión (RF-A5). */
export default function IndexScreen() {
  const { user } = useAuth();
  return <Redirect href={user ? '/(app)/(tabs)/calendar' : '/(auth)/login'} />;
}
