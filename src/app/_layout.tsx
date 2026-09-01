import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useResolvedScheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/providers';

SplashScreen.preventAutoHideAsync().catch(() => {
  // En web o si ya se ocultó: sin efecto.
});

/** Tema de navegación derivado de los tokens de kavi-design. */
const navigationThemes = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.ink,
      background: Colors.light.background,
      card: Colors.light.surface,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.today,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: Colors.dark.ink,
      background: Colors.dark.background,
      card: Colors.dark.surface,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.today,
    },
  },
};

/** Rutas protegidas: sin sesión → (auth); con sesión → (app). */
function RootNavigator() {
  const { session, isLoading } = useAuth();
  const isSignedIn = !!session;

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // Mantener el splash hasta restaurar la sesión evita el parpadeo de login.
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useResolvedScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={navigationThemes[scheme]}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
