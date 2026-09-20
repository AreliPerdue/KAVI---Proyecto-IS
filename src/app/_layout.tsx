import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, type ErrorBoundaryProps, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorFallback } from '@/components/error-fallback';
import { SplashView } from '@/components/splash-view';
import { Colors } from '@/constants/theme';
import { useBrandFonts } from '@/hooks/use-brand-fonts';
import { useSplashGate } from '@/hooks/use-splash-gate';
import { useResolvedScheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, ConfirmProvider, SnackbarProvider, useAuth } from '@/providers';

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
  const { user, isLoading, signUpPending } = useAuth();
  const fontsReady = useBrandFonts();
  const showSplash = useSplashGate(isLoading || !fontsReady);
  // Durante el último paso del alta hay sesión pero aún no contraseña (RF-A8).
  const isSignedIn = !!user && !signUpPending;

  // El splash nativo se retira en el mismo momento que `SplashView`, así no se ve
  // el relevo entre uno y otro.
  useEffect(() => {
    if (!showSplash) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [showSplash]);

  // Mantener el splash hasta restaurar la sesión evita el parpadeo de login.
  if (showSplash) return <SplashView />;

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

/** Error boundary raíz de Expo Router. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />;
}

export default function RootLayout() {
  const scheme = useResolvedScheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider value={navigationThemes[scheme]}>
            <SnackbarProvider>
              <ConfirmProvider>
                <RootNavigator />
              </ConfirmProvider>
            </SnackbarProvider>
            <StatusBar style="light" />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
