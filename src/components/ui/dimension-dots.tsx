import { StyleSheet, View } from 'react-native';

import { DIMENSIONS, dimensionColor } from '@/constants/dimensions';
import { Spacing } from '@/constants/theme';
import { useColorblind } from '@/hooks/use-theme';

/** Marca de KAVI: las 7 dimensiones como puntos de color (elemento firma). */
export function DimensionDots({ size = 8 }: { size?: number }) {
  const colorblind = useColorblind();
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {DIMENSIONS.map((d) => (
        <View
          key={d.key}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: dimensionColor(d.key, colorblind) }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
});
