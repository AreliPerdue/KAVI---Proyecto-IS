import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Mismo ancho que `imageWidth` del splash nativo (app.json): no hay salto al relevarlo. */
const LOGO_WIDTH = 220;
const LOGO_ASPECT = 1080 / 1331;

/**
 * Pantalla de arranque mientras se restaura la sesión. Repite el logo con eslogan
 * del splash nativo, así que el relevo entre uno y otro es invisible (y en web
 * evita la pantalla en blanco).
 */
export function SplashView() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Image
        source={require('../../assets/images/splash-icon.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="KAVI — Plan more. be more."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  logo: { width: LOGO_WIDTH, aspectRatio: LOGO_ASPECT },
});
