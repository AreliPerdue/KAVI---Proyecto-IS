import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { overlayColor } from './overlay';

import { AppText } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useTheme } from '@/hooks/use-theme';

export type PeopleTabsProps = {
  overlayUserId: string | null;
  onChange: (userId: string | null) => void;
};

/** Pestañas "Tú · contacto · + Contactos" para superponer el calendario de alguien (RF-S7, RF-S8). */
export function PeopleTabs({ overlayUserId, onChange }: PeopleTabsProps) {
  const theme = useTheme();
  const router = useRouter();
  const contacts = useContacts();
  const sharing = (contacts.data ?? []).filter((c) => c.kind === 'accepted' && c.theirCalendarVisibility);

  const Tab = ({ label, selected, color, onPress }: { label: string; selected: boolean; color?: string; onPress: () => void }) => (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        { backgroundColor: selected ? (color ?? theme.ink) : theme.surfaceAlt },
        pressed ? styles.pressed : null,
      ]}>
      <AppText variant="bodyStrong" style={{ color: selected ? '#FFFFFF' : theme.textSecondary }}>
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      <Tab label="Tú" selected={overlayUserId === null} onPress={() => onChange(null)} />
      {sharing.map((c, index) => (
        <Tab
          key={c.profile.id}
          label={c.profile.display_name?.split(' ')[0] ?? c.profile.username}
          selected={overlayUserId === c.profile.id}
          color={overlayColor(index)}
          onPress={() => onChange(overlayUserId === c.profile.id ? null : c.profile.id)}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar contactos"
        onPress={() => router.push('/(app)/(tabs)/shared')}
        style={({ pressed }) => [styles.tab, styles.addTab, { backgroundColor: theme.surfaceAlt }, pressed ? styles.pressed : null]}>
        <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="bodyStrong" color="textSecondary">
          Contactos
        </AppText>
      </Pressable>
      <View style={{ width: Spacing.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  tab: { minHeight: 40, paddingHorizontal: Spacing.lg, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  addTab: { flexDirection: 'row', gap: Spacing.xs, paddingLeft: Spacing.md },
  pressed: { opacity: 0.75 },
});
