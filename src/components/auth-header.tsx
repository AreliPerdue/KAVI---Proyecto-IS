import { StyleSheet, View } from 'react-native';

import { AppText, DimensionDots } from '@/components/ui';
import { Spacing } from '@/constants/theme';

/** Encabezado de las pantallas de auth: wordmark + puntos de las 7 dimensiones. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <AppText variant="display" accessibilityRole="header">
          KAVI
        </AppText>
        <DimensionDots />
      </View>
      <View style={styles.copy}>
        <AppText variant="heading">{title}</AppText>
        <AppText color="textSecondary">{subtitle}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xl },
  brand: { gap: Spacing.sm },
  copy: { gap: Spacing.xs },
});
