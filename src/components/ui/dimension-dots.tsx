import { StyleSheet, View } from 'react-native';

import { DIMENSIONS } from '@/constants/dimensions';
import { Spacing } from '@/constants/theme';

/** Marca de KAVI: las 7 dimensiones como puntos de color (elemento firma). */
export function DimensionDots({ size = 8 }: { size?: number }) {
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {DIMENSIONS.map((d) => (
        <View
          key={d.key}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: d.color }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
});
