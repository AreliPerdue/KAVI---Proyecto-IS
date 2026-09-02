import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Fila de acción grande (≥ 52 px) para hojas de detalle. */
export function ActionRow({
  icon,
  label,
  onPress,
  color = 'text',
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  color?: ThemeColor;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: theme.surfaceAlt } : null, disabled ? styles.disabled : null]}>
      {icon}
      <AppText variant="bodyStrong" color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  disabled: { opacity: 0.4 },
});
