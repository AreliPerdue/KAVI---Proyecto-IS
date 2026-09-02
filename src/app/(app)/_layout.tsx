import { ErrorFallback } from '@/components/error-fallback';
import { type ErrorBoundaryProps, Stack } from 'expo-router';
import { Platform } from 'react-native';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />;
}

/** Stack nativo del área autenticada: tabs + rutas modales (actividad, entrenamiento…). */
export default function AppLayout() {
  const modal = Platform.OS === 'web' ? 'card' : 'modal';
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="activity/new" options={{ presentation: modal }} />
      <Stack.Screen name="themes" options={{ presentation: modal }} />
      <Stack.Screen name="theme/new" options={{ presentation: modal }} />
      <Stack.Screen
        name="activity/[id]"
        options={{
          presentation: Platform.OS === 'ios' ? 'formSheet' : modal,
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
