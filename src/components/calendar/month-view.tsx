import { memo, useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { activityColor, tint } from './activity-style';
import { groupByDay } from './group-by-day';
import { isOverlayActivity } from './overlay';

import { AppText } from '@/components/ui';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayTitle, isSameMonth, isToday, monthGridDays, toDayKey, WEEKDAY_LABELS } from '@/lib/dates';
import type { Activity } from '@/types/domain';

const CHIP_HEIGHT = 18;
const CHIP_GAP = 3;
const DAY_NUMBER_HEIGHT = 26;

type DayCellProps = {
  cellHeight: number;
  date: Date;
  inMonth: boolean;
  activities: Activity[];
  theme: ThemeColors;
  onPress: (date: Date) => void;
};

const DayCell = memo(function DayCell({ cellHeight, date, inMonth, activities, theme, onPress }: DayCellProps) {
  const today = isToday(date);
  const count = activities.length;
  const maxChips = Math.max(1, Math.floor((cellHeight - DAY_NUMBER_HEIGHT - Spacing.xs) / (CHIP_HEIGHT + CHIP_GAP)));
  const overflow = count > maxChips ? count - (maxChips - 1) : 0;
  const visible = overflow > 0 ? activities.slice(0, maxChips - 1) : activities;
  const label = `${formatDayTitle(date)}, ${count === 0 ? 'sin actividades' : `${count} ${count === 1 ? 'actividad' : 'actividades'}`}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(date)}
      style={({ pressed }) => [
        styles.cell,
        { height: cellHeight },
        today ? { backgroundColor: theme.surfaceAlt } : null,
        pressed ? { opacity: 0.7 } : null,
      ]}>
      <View style={styles.dayNumberRow}>
        <View style={[styles.dayNumber, today ? { backgroundColor: theme.today } : null]}>
          <AppText variant="label" tabular color={today ? 'onInk' : inMonth ? 'text' : 'textTertiary'} style={today ? styles.todayText : null}>
            {date.getDate()}
          </AppText>
        </View>
      </View>
      <View style={styles.chips}>
        {visible.map((activity) => {
          const color = activityColor(activity, theme);
          const foreign = isOverlayActivity(activity) || !!activity.owner_name;
          return (
            <View
              key={activity.id}
              style={[
                styles.chip,
                { backgroundColor: tint(color, foreign ? 0.35 : 0.18), borderLeftColor: color },
                foreign ? { borderStyle: 'dashed', borderWidth: 1, borderColor: color, borderLeftWidth: 1 } : null,
              ]}>
              <AppText variant="caption" numberOfLines={1} style={[styles.chipText, { color: inMonth ? theme.text : theme.textSecondary }]}>
                {activity.title}
              </AppText>
            </View>
          );
        })}
        {overflow > 0 ? (
          <AppText variant="caption" color="textSecondary" style={styles.more}>
            +{overflow} más
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
});

export type MonthViewProps = {
  anchor: Date;
  activities: readonly Activity[];
  onSelectDay: (date: Date) => void;
};

/** Vista mensual: grid de 6 semanas con chips por actividad y "+N más" (RF-C1). */
export function MonthView({ anchor, activities, onSelectDay }: MonthViewProps) {
  const theme = useTheme();
  const days = useMemo(() => monthGridDays(anchor), [anchor]);
  const byDay = useMemo(() => groupByDay(activities), [activities]);
  const handlePress = useCallback((date: Date) => onSelectDay(date), [onSelectDay]);
  const [gridHeight, setGridHeight] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setGridHeight(e.nativeEvent.layout.height), []);
  const cellHeight = Math.max(76, Math.floor(gridHeight / 6));

  return (
    <View style={styles.container}>
      <View style={[styles.weekHeader, { borderBottomColor: theme.border }]}>
        {WEEKDAY_LABELS.map((label, index) => (
          <AppText key={index} variant="caption" color="textTertiary" style={styles.weekHeaderText}>
            {label}
          </AppText>
        ))}
      </View>
      <View style={styles.grid} onLayout={onLayout}>
        {days.map((date, index) => (
          <View
            key={toDayKey(date)}
            style={[styles.cellWrapper, index % 7 !== 0 ? { borderLeftColor: theme.border, borderLeftWidth: StyleSheet.hairlineWidth } : null, index >= 7 ? { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
            <DayCell
              cellHeight={cellHeight}
              date={date}
              inMonth={isSameMonth(date, anchor)}
              activities={byDay.get(toDayKey(date)) ?? []}
              theme={theme}
              onPress={handlePress}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekHeader: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: Spacing.xs },
  weekHeaderText: { flex: 1, textAlign: 'center' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', overflow: 'hidden' },
  cellWrapper: { width: `${100 / 7}%` },
  cell: { paddingHorizontal: 2, paddingBottom: 2, overflow: 'hidden' },
  dayNumberRow: { height: DAY_NUMBER_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { minWidth: 24, height: 24, paddingHorizontal: 4, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  todayText: { fontWeight: '700' },
  chips: { gap: CHIP_GAP },
  chip: { height: CHIP_HEIGHT, borderRadius: 4, borderCurve: 'continuous', borderLeftWidth: 2, paddingHorizontal: 3, justifyContent: 'center' },
  chipText: { fontSize: 11, lineHeight: 13 },
  more: { fontSize: 10, lineHeight: 12, textAlign: 'center' },
});
