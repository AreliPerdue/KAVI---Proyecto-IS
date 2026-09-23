import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

/** Mismo ancho que `imageWidth` del splash nativo (app.json): no hay salto al relevarlo. */
const LOGO_WIDTH = 220;
const LOGO_ASPECT = 1080 / 1331;

/**
 * Pantalla de arranque mientras se restaura la sesión. Repite el logo con eslogan
 * del splash nativo, así que el relevo entre uno y otro es invisible (y en web
 * evita la pantalla en blanco).
 *
 * Siempre en oscuro, aunque se haya elegido apariencia clara (NFR-18): el splash
 * nativo lo fija `app.json` antes de que exista JavaScript para leer la preferencia,
 * y el logo es de contorno blanco —sobre fondo claro desaparecería—. Seguir aquí la
 * preferencia rompería el relevo con un parpadeo de oscuro a claro y de vuelta.
 */
export function SplashView() {
  return (
    <View style={[styles.root, { backgroundColor: Colors.dark.background }]}>
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
