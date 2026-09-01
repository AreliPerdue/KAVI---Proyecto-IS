import { TabList, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { CalendarDays, Dumbbell, UserRound, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, DimensionDots } from '@/components/ui';
import { IconSize, IconStroke, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'calendar', href: '/(app)/(tabs)/calendar', label: 'Calendario', Icon: CalendarDays },
  { name: 'shared', href: '/(app)/(tabs)/shared', label: 'Compartido', Icon: Users },
  { name: 'fitness', href: '/(app)/(tabs)/fitness', label: 'Fitness', Icon: Dumbbell },
  { name: 'profile', href: '/(app)/(tabs)/profile', label: 'Perfil', Icon: UserRound },
] as const;

type TabButtonProps = TabTriggerSlotProps & { label: string; Icon: typeof CalendarDays };

function TabButton({ label, Icon, isFocused, ...props }: TabButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.ink : theme.textSecondary;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [
        styles.tab,
        isFocused ? { backgroundColor: theme.surfaceAlt } : null,
        pressed ? styles.pressed : null,
      ]}>
      <Icon size={IconSize.inline} strokeWidth={IconStroke} color={color} />
      <AppText variant="label" color={isFocused ? 'ink' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Tabs web: barra superior con ancho máximo (NFR-9). */
export default function TabsLayoutWeb() {
  const theme = useTheme();
  return (
    <Tabs>
      <View style={[styles.bar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.barInner}>
          <View style={styles.brand}>
            <AppText variant="heading">KAVI</AppText>
            <DimensionDots size={6} />
          </View>
          <TabList style={styles.tabList}>
            {TABS.map(({ name, href, label, Icon }) => (
              <TabTrigger key={name} name={name} href={href} asChild>
                <TabButton label={label} Icon={Icon} />
              </TabTrigger>
            ))}
          </TabList>
        </View>
      </View>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1, alignItems: 'center' },
  barInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: Spacing.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tabList: { flexDirection: 'row', gap: Spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.7 },
  slot: { flex: 1 },
});
