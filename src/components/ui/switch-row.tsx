import { Switch, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Fila etiqueta + interruptor. */
export function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <AppText>{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="textTertiary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.ink, false: theme.border }}
        thumbColor={theme.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, minHeight: 44 },
  text: { flex: 1, gap: 2 },
});
