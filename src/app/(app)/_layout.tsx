import { ErrorFallback } from '@/components/error-fallback';
import { type ErrorBoundaryProps, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useRealtimeInvalidation } from '@/hooks/use-realtime';
import { useReminderSync } from '@/hooks/use-reminders';
import { useSocialNotifications } from '@/hooks/use-social-notifications';
import { usePreferencesStore } from '@/store/preferences-store';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />;
}

/** Programa/reprograma notificaciones locales según los reminders (RF-C10). */
function ReminderSync() {
  useReminderSync();
  useRealtimeInvalidation();
  useSocialNotifications();
  return null;
}

/**
 * Carga la preferencia de reloj antes de pintar nada del área autenticada. Va
 * aquí y no en el calendario porque el formato de hora se usa también en
 * Fitness y en los avisos de recordatorio.
 */
function Preferencias() {
  const hydrate = usePreferencesStore((s) => s.hydrate);
  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  return null;
}

/** Stack nativo del área autenticada: tabs + rutas modales (actividad, entrenamiento…). */
export default function AppLayout() {
  const modal = Platform.OS === 'web' ? 'card' : 'modal';
  return (
    <>
      <ReminderSync />
      <Preferencias />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="activity/new" options={{ presentation: modal }} />
      <Stack.Screen name="activity/share" options={{ presentation: modal }} />
      <Stack.Screen name="shared/availability" options={{ presentation: modal }} />
      <Stack.Screen name="workout/[id]" options={{ presentation: modal }} />
      <Stack.Screen name="themes" options={{ presentation: modal }} />
      <Stack.Screen name="admin" options={{ presentation: modal }} />
      <Stack.Screen name="theme/new" options={{ presentation: modal }} />
      {/*
        * El detalle se presentaba como `formSheet` en iOS y daba problemas: el contenido
        * abría fuera de la zona visible y desaparecía al desplazar o tocar. La causa es
        * estructural — dentro lleva un `Sheet` (el de "¿solo esta ocurrencia o toda la
        * serie?"), que es un `Modal` de React Native, y presentar un Modal desde dentro
        * de un formSheet desprende el contenido de la hoja. Usa la misma presentación
        * que el resto de modales de la app, que no tienen ese conflicto.
        */}
      <Stack.Screen name="activity/[id]" options={{ presentation: modal }} />
    </Stack>
    </>
  );
}
