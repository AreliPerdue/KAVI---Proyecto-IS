import { Bell } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip } from '@/components/ui';
import { REMINDER_PRESETS } from '@/constants/reminders';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Presets de recordatorio, múltiples (RF-C9). */
export function RemindersField({ value, onChange }: { value: number[]; onChange: (offsets: number[]) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          Recordatorios
        </AppText>
      </View>
      <View style={styles.chips}>
        {REMINDER_PRESETS.map((preset) => {
          const selected = value.includes(preset.offset);
          return (
            <Chip
              key={preset.offset}
              label={preset.label}
              selected={selected}
              onPress={() => onChange(selected ? value.filter((o) => o !== preset.offset) : [...value, preset.offset].sort((a, b) => a - b))}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
