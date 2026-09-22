import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Campo de formulario que abre un selector (fecha, hora, tema…). */
export function FieldButton({
  label,
  value,
  placeholder = 'Elegir',
  onPress,
  leading,
  error,
  disabled,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  onPress: () => void;
  leading?: ReactNode;
  error?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <AppText variant="label" color="textSecondary" numberOfLines={1}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.surface, borderColor: error ? theme.danger : theme.border },
          pressed ? { backgroundColor: theme.surfaceAlt } : null,
          disabled ? styles.disabled : null,
        ]}>
        {leading}
        <AppText color={value ? 'text' : 'textTertiary'} style={styles.value} numberOfLines={1}>
          {value ?? placeholder}
        </AppText>
      </Pressable>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs, flex: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: MinTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
  },
  value: { flex: 1 },
  disabled: { opacity: 0.6 },
});
