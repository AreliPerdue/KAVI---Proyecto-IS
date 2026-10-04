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
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Color de acento (dimensión/tema); si no, tinta. */
  color?: string;
  icon?: ReactNode;
  compact?: boolean;
  /** Si la etiqueta visible no se entiende sola ("3" en una escala), lo que se lee en voz alta. */
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const accent = color ?? theme.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      // El chip mide 32–36 de alto; el área táctil llega a 44 sin cambiar cómo se ve.
      hitSlop={{ top: compact ? 6 : 4, bottom: compact ? 6 : 4 }}
      style={({ pressed }) => [
        styles.chip,
        compact ? styles.compact : null,
        { borderColor: selected ? accent : theme.border, backgroundColor: selected ? accent : theme.surface },
        pressed ? styles.pressed : null,
      ]}>
      {icon}
      {/* Sobre un color de dimensión el texto va en blanco; sobre tinta, en su contraste (que en oscuro es casi negro). */}
      <AppText variant="label" style={{ color: selected ? (color ? '#FFFFFF' : theme.onInk) : theme.text }}>
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
