import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { MinTouchTarget, Radius } from '@/constants/theme';

/** Botón de solo icono con área táctil mínima y etiqueta accesible obligatoria. */
export function IconButton({
  label,
  onPress,
  children,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed ? styles.pressed : null, disabled ? styles.disabled : null, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
});
