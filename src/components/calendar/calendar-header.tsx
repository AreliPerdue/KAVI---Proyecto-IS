import { ChevronDown, ChevronLeft, ChevronRight, LayoutList, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActionRow, AppText, DatePickerSheet, IconButton, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type CalendarView, formatDayTitle, formatMonthTitle, formatWeekTitle } from '@/lib/dates';

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Mes' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
];

export type CalendarHeaderProps = {
  view: CalendarView;
  anchor: Date;
  onChangeView: (view: CalendarView) => void;
  onChangeAnchor: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
};

/** Header del calendario: mes con menú desplegable, Hoy, selector de vista y filtros (RF-C4). */
export function CalendarHeader({
  view,
  anchor,
  onChangeView,
  onChangeAnchor,
  onPrev,
  onNext,
  onToday,
  onOpenFilters,
  activeFilterCount = 0,
}: CalendarHeaderProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const title =
    view === 'month' ? formatMonthTitle(anchor) : view === 'week' ? formatWeekTitle(anchor) : formatDayTitle(anchor);
  const viewLabel = VIEW_OPTIONS.find((o) => o.value === view)?.label ?? 'Mes';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. Cambiar de fecha`}
        onPress={() => setMonthPickerOpen(true)}
        style={({ pressed }) => [styles.titleButton, pressed ? styles.pressed : null]}>
        <AppText variant={wide ? 'title' : 'heading'} numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <ChevronDown size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
      </Pressable>

      <View style={styles.actions}>
        {wide ? (
          <>
            <IconButton label="Anterior" onPress={onPrev}>
              <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
            <IconButton label="Siguiente" onPress={onNext}>
              <ChevronRight size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir a hoy"
          onPress={onToday}
          style={({ pressed }) => [styles.todayButton, { borderColor: theme.border }, pressed ? styles.pressed : null]}>
          <AppText variant="label">Hoy</AppText>
        </Pressable>
        <IconButton label={`Vista: ${viewLabel}. Cambiar vista`} onPress={() => setViewMenuOpen(true)}>
          <LayoutList size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        {onOpenFilters ? (
          <IconButton label={activeFilterCount > 0 ? `Filtros, ${activeFilterCount} activos` : 'Filtros'} onPress={onOpenFilters}>
            <View>
              <SlidersHorizontal size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
              {activeFilterCount > 0 ? <View style={[styles.filterDot, { backgroundColor: theme.today }]} /> : null}
            </View>
          </IconButton>
        ) : null}
      </View>

      <DatePickerSheet
        visible={monthPickerOpen}
        value={anchor}
        title="Ir a una fecha"
        onClose={() => setMonthPickerOpen(false)}
        onSelect={(date) => {
          onChangeAnchor(date);
          setMonthPickerOpen(false);
        }}
      />

      <Sheet visible={viewMenuOpen} onClose={() => setViewMenuOpen(false)} title="Vista">
        {VIEW_OPTIONS.map((option) => (
          <ActionRow
            key={option.value}
            icon={<View style={[styles.viewDot, { backgroundColor: option.value === view ? theme.ink : theme.border }]} />}
            label={option.label}
            onPress={() => {
              onChangeView(option.value);
              setViewMenuOpen(false);
            }}
          />
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  titleButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 1, minHeight: 44 },
  title: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  todayButton: { minHeight: 36, paddingHorizontal: Spacing.md, borderWidth: 1, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4 },
  viewDot: { width: 10, height: 10, borderRadius: 5 },
  pressed: { opacity: 0.7 },
});
