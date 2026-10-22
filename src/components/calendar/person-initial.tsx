import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { initialOf } from '@/lib/color-vision';

/**
 * La inicial de otra persona sobre su bloque, con el modo daltonismo (spec 05, RF-T10): sus colores de Nobi no
 * alcanzan a distinguirse, la letra sí. Se oculta al lector de pantalla porque el bloque ya dice de quién es.
 */
export function PersonInitial({ name, color }: { name: string | null | undefined; color: string }) {
  const inicial = initialOf(name);
  if (!inicial) return null;
  return (
    <View style={[styles.marca, { borderColor: color }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <AppText variant="micro" style={styles.letra}>
        {inicial}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  marca: { minWidth: 16, height: 16, paddingHorizontal: 2, borderRadius: 8, borderCurve: 'continuous', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  letra: { fontWeight: '700' },
});
