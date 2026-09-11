import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from './activity-style';

import { AppText } from '@/components/ui';
import { SELF_COLOR } from '@/constants/people-colors';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useTheme } from '@/hooks/use-theme';

export type PeopleTabsProps = {
  /** Contactos superpuestos ahora mismo. Vacío = solo mi calendario. */
  overlayUserIds: string[];
  colorOf: (userId: string) => string;
  onToggle: (userId: string) => void;
  onOnlyMe: () => void;
};

function PersonTab({ label, selected, color, onPress }: { label: string; selected: boolean; color: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        // El color de la persona va en el punto y el borde, no de relleno: así la
        // etiqueta conserva el contraste del token de texto en ambos estados.
        selected
          ? { backgroundColor: tint(color, 0.22), borderColor: color }
          : { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' },
        pressed ? styles.pressed : null,
      ]}>
      <View style={[styles.dot, { backgroundColor: color, opacity: selected ? 1 : 0.55 }]} />
      <AppText variant="bodyStrong" color={selected ? 'text' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Pestañas "Tú · contactos · + Contactos" para superponer calendarios (RF-S7, RF-S8, RF-S15).
 * Se pueden activar varios contactos a la vez; "Tú" vuelve a dejar solo mi calendario.
 */
export function PeopleTabs({ overlayUserIds, colorOf, onToggle, onOnlyMe }: PeopleTabsProps) {
  const theme = useTheme();
  const router = useRouter();
  const contacts = useContacts();
  const sharing = (contacts.data ?? []).filter((c) => c.kind === 'accepted' && c.theirCalendarVisibility);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      <PersonTab label="Tú" selected color={SELF_COLOR} onPress={onOnlyMe} />
      {sharing.map((c) => (
        <PersonTab
          key={c.profile.id}
          label={c.profile.display_name?.split(' ')[0] ?? 'Contacto'}
          selected={overlayUserIds.includes(c.profile.id)}
          color={colorOf(c.profile.id)}
          onPress={() => onToggle(c.profile.id)}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar contactos"
        onPress={() => router.push('/(app)/(tabs)/shared')}
        style={({ pressed }) => [styles.tab, styles.addTab, { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }, pressed ? styles.pressed : null]}>
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
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  addTab: { gap: Spacing.xs, paddingLeft: Spacing.sm },
  pressed: { opacity: 0.75 },
});
