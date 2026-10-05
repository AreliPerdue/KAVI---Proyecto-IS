import { Check } from 'lucide-react-native';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { IconSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { contrastRatio, needsOutline } from '@/lib/color';

/** Palomita legible sobre el color: oscura sobre los claros (rosa, amarillo, lima, blanco). */
function marcaSobre(hex: string, tinta: string, papel: string): string {
  return contrastRatio(hex, papel) >= contrastRatio(hex, tinta) ? papel : tinta;
}

/**
 * Muestra de color para los menús (persona, lista). El color va tal cual —es el del Nobi—
 * y, si casi no se distingue del fondo (negro, azul marino sobre la tinta de la app),
 * lleva un contorno claro (T202). La seleccionada lleva aro y palomita del color que se
 * lea sobre ella.
 */
export function ColorSwatch({
  hex,
  label,
  selected,
  onPress,
  size = 40,
  background,
}: {
  hex: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: number;
  /** Fondo sobre el que se pinta (por omisión, el de las hojas). */
  background?: string;
}) {
  const theme = useTheme();
  const fondo = background ?? theme.surface;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.aro,
        { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, borderColor: selected ? theme.text : 'transparent' },
        pressed ? styles.pressed : null,
      ]}>
      <View
        style={[
          styles.circulo,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: hex },
          needsOutline(hex, fondo) ? { borderWidth: 1, borderColor: theme.textTertiary } : null,
        ]}>
        {selected ? <Check size={IconSize.inline} strokeWidth={3} color={marcaSobre(hex, '#131313', '#FFFFFF')} /> : null}
      </View>
    </Pressable>
  );
}

/** Punto de color de una persona o lista, con contorno si no se distingue del fondo. */
export function ColorDot({ hex, size = 10, background, style }: { hex: string; size?: number; background?: string; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: hex },
        needsOutline(hex, background ?? theme.background) ? { borderWidth: 1, borderColor: theme.textTertiary } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  aro: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  circulo: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
