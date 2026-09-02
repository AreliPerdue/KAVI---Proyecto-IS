import { type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Chip seleccionable (filtros, días de la semana, dimensiones). */
export function Chip({
  label,
  selected,
  onPress,
  color,
  icon,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Color de acento (dimensión/tema); si no, tinta. */
  color?: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  const theme = useTheme();
  const accent = color ?? theme.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        compact ? styles.compact : null,
        { borderColor: selected ? accent : theme.border, backgroundColor: selected ? accent : theme.surface },
        pressed ? styles.pressed : null,
      ]}>
      {icon}
      <AppText variant="label" style={{ color: selected ? '#FFFFFF' : theme.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  compact: { minHeight: 32, paddingHorizontal: Spacing.sm },
  pressed: { opacity: 0.75 },
});
