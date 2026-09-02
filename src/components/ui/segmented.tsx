import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedOption<T extends string> = { value: T; label: string };

/** Selector segmentado (p. ej. Mes / Semana / Día). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected ? { backgroundColor: theme.surface, boxShadow: '0 1px 2px rgba(22,23,26,0.08)' } : null,
              pressed ? styles.pressed : null,
            ]}>
            <AppText variant="label" color={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    gap: 2,
  },
  segment: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    minHeight: 34,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
