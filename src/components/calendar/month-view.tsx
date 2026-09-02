import { memo, useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { activityColor } from './activity-style';
import { groupByDay } from './group-by-day';

import { AppText } from '@/components/ui';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayTitle, isSameMonth, isToday, monthGridDays, toDayKey, WEEKDAY_LABELS } from '@/lib/dates';
import type { Activity } from '@/types/domain';

const MAX_DOTS = 4;

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
  const label = `${formatDayTitle(date)}, ${count === 0 ? 'sin actividades' : `${count} ${count === 1 ? 'actividad' : 'actividades'}`}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(date)}
      style={({ pressed }) => [styles.cell, { height: cellHeight }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      <View style={[styles.dayNumber, today ? { backgroundColor: theme.today } : null]}>
        <AppText
          variant="label"
          tabular
          color={today ? 'onInk' : inMonth ? 'text' : 'textTertiary'}
          style={today ? styles.todayText : null}>
          {date.getDate()}
        </AppText>
      </View>
      <View style={styles.dots}>
        {activities.slice(0, MAX_DOTS).map((activity) => (
          <View
            key={activity.id}
            style={[styles.dot, { backgroundColor: activityColor(activity, theme) }]}
          />
        ))}
        {count > MAX_DOTS ? (
          <AppText variant="caption" color="textTertiary">
            +{count - MAX_DOTS}
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

/** Vista mensual: grid de 6 semanas con puntos de color por actividad (RF-C1). */
export function MonthView({ anchor, activities, onSelectDay }: MonthViewProps) {
  const theme = useTheme();
  const days = useMemo(() => monthGridDays(anchor), [anchor]);
  const byDay = useMemo(() => groupByDay(activities), [activities]);
  const handlePress = useCallback((date: Date) => onSelectDay(date), [onSelectDay]);
  const [gridHeight, setGridHeight] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => setGridHeight(e.nativeEvent.layout.height), []);
  const cellHeight = Math.max(64, Math.floor(gridHeight / 6));

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
        {days.map((date) => (
          <DayCell
            cellHeight={cellHeight}
            key={toDayKey(date)}
            date={date}
            inMonth={isSameMonth(date, anchor)}
            activities={byDay.get(toDayKey(date)) ?? []}
            theme={theme}
            onPress={handlePress}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.xs,
  },
  weekHeaderText: { flex: 1, textAlign: 'center' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  cell: {
    width: `${100 / 7}%`,
    minHeight: 64,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  dayNumber: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { fontWeight: '700' },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
