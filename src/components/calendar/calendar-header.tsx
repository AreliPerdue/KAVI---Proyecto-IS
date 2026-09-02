import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton, Segmented, type SegmentedOption } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type CalendarView, formatDayTitle, formatMonthTitle, formatWeekTitle } from '@/lib/dates';

const VIEW_OPTIONS: readonly SegmentedOption<CalendarView>[] = [
  { value: 'month', label: 'Mes' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
];

export type CalendarHeaderProps = {
  view: CalendarView;
  anchor: Date;
  onChangeView: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
};

/** Header del calendario: título, navegación, Hoy, selector de vista y filtros (RF-C4, spec 04 UI). */
export function CalendarHeader({
  view,
  anchor,
  onChangeView,
  onPrev,
  onNext,
  onToday,
  onOpenFilters,
  activeFilterCount = 0,
}: CalendarHeaderProps) {
  const theme = useTheme();
  const title =
    view === 'month' ? formatMonthTitle(anchor) : view === 'week' ? formatWeekTitle(anchor) : formatDayTitle(anchor);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <AppText variant="title" accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <View style={styles.nav}>
          <IconButton label="Anterior" onPress={onPrev}>
            <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir a hoy"
            onPress={onToday}
            style={({ pressed }) => [styles.todayButton, { borderColor: theme.border }, pressed ? styles.pressed : null]}>
            <AppText variant="label">Hoy</AppText>
          </Pressable>
          <IconButton label="Siguiente" onPress={onNext}>
            <ChevronRight size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        </View>
      </View>
      <View style={styles.controlsRow}>
        <Segmented options={VIEW_OPTIONS} value={view} onChange={onChangeView} />
        {onOpenFilters ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeFilterCount > 0 ? `Filtros, ${activeFilterCount} activos` : 'Filtros'}
            onPress={onOpenFilters}
            style={({ pressed }) => [
              styles.filterButton,
              { borderColor: theme.border, backgroundColor: activeFilterCount > 0 ? theme.ink : 'transparent' },
              pressed ? styles.pressed : null,
            ]}>
            <SlidersHorizontal size={IconSize.inline} strokeWidth={IconStroke} color={activeFilterCount > 0 ? theme.onInk : theme.text} />
            {activeFilterCount > 0 ? (
              <AppText variant="caption" color="onInk">
                {activeFilterCount}
              </AppText>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  title: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  todayButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 40,
    minWidth: 44,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
