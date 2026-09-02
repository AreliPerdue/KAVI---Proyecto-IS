import { ErrorFallback } from '@/components/error-fallback';
import { type ErrorBoundaryProps } from 'expo-router';
import { TabList, type TabListProps, TabSlot, TabTrigger, type TabTriggerSlotProps, Tabs } from 'expo-router/ui';
import { CalendarDays, Dumbbell, UserRound, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, DimensionDots } from '@/components/ui';
import { IconSize, IconStroke, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useSharedBadgeCount } from '@/hooks/use-shared-badge';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'calendar', href: '/(app)/(tabs)/calendar', label: 'Calendario', Icon: CalendarDays },
  { name: 'shared', href: '/(app)/(tabs)/shared', label: 'Compartido', Icon: Users },
  { name: 'fitness', href: '/(app)/(tabs)/fitness', label: 'Fitness', Icon: Dumbbell },
  { name: 'profile', href: '/(app)/(tabs)/profile', label: 'Perfil', Icon: UserRound },
] as const;

type TabButtonProps = TabTriggerSlotProps & { label: string; Icon: typeof CalendarDays; badge?: number };

function TabButton({ label, Icon, isFocused, badge = 0, ...props }: TabButtonProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const showLabel = width >= 720;
  const color = isFocused ? theme.ink : theme.textSecondary;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={badge > 0 ? `${label}, ${badge} pendientes` : label}
      accessibilityState={{ selected: !!isFocused }}
      style={({ pressed }) => [
        styles.tab,
        isFocused ? { backgroundColor: theme.surfaceAlt } : null,
        pressed ? styles.pressed : null,
      ]}>
      <Icon size={showLabel ? IconSize.inline : IconSize.action} strokeWidth={IconStroke} color={color} />
      {showLabel ? (
        <AppText variant="label" color={isFocused ? 'ink' : 'textSecondary'}>
          {label}
        </AppText>
      ) : null}
      {badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.today }]}>
          <AppText variant="caption" color="onInk">
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorFallback {...props} />;
}

type TopBarProps = TabListProps;

/** Barra superior web: marca + triggers (TabList con asChild exige un solo hijo). */
function TopBar({ children, ...props }: TopBarProps) {
  const theme = useTheme();
  const wide = useWindowDimensions().width >= 720;
  return (
    <View {...props} style={[styles.bar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={styles.barInner}>
        <View style={styles.brand}>
          <AppText variant="heading">KAVI</AppText>
          {wide ? <DimensionDots size={6} /> : null}
        </View>
        <View style={styles.tabList}>{children}</View>
      </View>
    </View>
  );
}

/** Tabs web: barra superior con ancho máximo (NFR-9). */
export default function TabsLayoutWeb() {
  const badge = useSharedBadgeCount();
  return (
    <Tabs>
      <TabList asChild>
        <TopBar>
          {TABS.map(({ name, href, label, Icon }) => (
            <TabTrigger key={name} name={name} href={href} asChild>
              <TabButton label={label} Icon={Icon} badge={name === 'shared' ? badge : 0} />
            </TabTrigger>
          ))}
        </TopBar>
      </TabList>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tabList: { flexDirection: 'row', gap: Spacing.xs },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.7 },
  slot: { flex: 1 },
  badge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
