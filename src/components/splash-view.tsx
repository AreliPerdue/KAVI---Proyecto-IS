import { StyleSheet, View } from 'react-native';

import { AppText, DimensionDots } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Pantalla de arranque mientras se restaura la sesión (evita pantalla en blanco en web). */
export function SplashView() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <AppText variant="display">KAVI</AppText>
      <DimensionDots />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
});
