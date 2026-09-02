import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActivityBlock } from './activity-block';
import { layoutDay } from './layout-blocks';

import { AppText } from '@/components/ui';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatHourLabel, isToday, minutesSinceMidnight, toDayKey, WEEKDAY_SHORT } from '@/lib/dates';
import type { Activity } from '@/types/domain';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GUTTER_WIDTH = 44;

export type TimelineProps = {
  days: Date[];
  activitiesByDay: Map<string, Activity[]>;
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  hourHeight?: number;
  compact?: boolean;
  isSharedActivity?: (activity: Activity) => boolean;
};

type ColumnProps = {
  day: Date;
  activities: Activity[];
  hourHeight: number;
  compact: boolean;
  theme: ThemeColors;
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  isSharedActivity?: (activity: Activity) => boolean;
};

const DayColumn = memo(function DayColumn({
  day,
  activities,
  hourHeight,
  compact,
  theme,
  onPressSlot,
  onPressActivity,
  isSharedActivity,
}: ColumnProps) {
  const blocks = useMemo(() => layoutDay(activities, day), [activities, day]);
  const pxPerMinute = hourHeight / 60;
  const today = isToday(day);
  const nowMinutes = minutesSinceMidnight(new Date());

  return (
    <View style={[styles.column, { borderLeftColor: theme.border }]}>
      {HOURS.map((hour) => (
        <Pressable
          key={hour}
          accessibilityRole="button"
          accessibilityLabel={`Crear actividad a las ${formatHourLabel(hour)}`}
          onPress={() => onPressSlot(day, hour * 60)}
          style={({ pressed }) => [
            styles.slot,
            { height: hourHeight, borderTopColor: theme.border },
            pressed ? { backgroundColor: theme.surfaceAlt } : null,
          ]}
        />
      ))}
      {blocks.map((block) => {
        const width = `${100 / block.columns}%` as const;
        const left = `${(100 / block.columns) * block.column}%` as const;
        return (
          <View
            key={block.activity.id}
            style={[
              styles.blockWrapper,
              {
                top: block.start * pxPerMinute + 1,
                height: Math.max((block.end - block.start) * pxPerMinute - 2, 22),
                left,
                width,
              },
            ]}>
            <ActivityBlock
              activity={block.activity}
              onPress={onPressActivity}
              compact={compact}
              shared={isSharedActivity?.(block.activity)}
            />
          </View>
        );
      })}
      {today ? (
        <View pointerEvents="none" style={[styles.nowLine, { top: nowMinutes * pxPerMinute, backgroundColor: theme.today }]}>
          <View style={[styles.nowDot, { backgroundColor: theme.today }]} />
        </View>
      ) : null}
    </View>
  );
});

/** Timeline vertical compartido por las vistas diaria (1 columna) y semanal (7). */
export function Timeline({
  days,
  activitiesByDay,
  onPressSlot,
  onPressActivity,
  hourHeight = 56,
  compact = false,
  isSharedActivity,
}: TimelineProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const multiDay = days.length > 1;

  // Arranca cerca de la hora actual (o de las 7:00) para no empezar en medianoche.
  useEffect(() => {
    const target = Math.max(0, (Math.min(new Date().getHours(), 20) - 1) * hourHeight - 4);
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: target, animated: false }), 0);
    return () => clearTimeout(id);
  }, [hourHeight, days]);

  const allDay = useMemo(
    () => days.map((day) => (activitiesByDay.get(toDayKey(day)) ?? []).filter((a) => a.all_day)),
    [days, activitiesByDay],
  );
  const hasAllDay = allDay.some((list) => list.length > 0);

  return (
    <View style={styles.container}>
      {multiDay ? (
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={{ width: GUTTER_WIDTH }} />
          {days.map((day, index) => {
            const today = isToday(day);
            return (
              <View key={toDayKey(day)} style={styles.headerDay}>
                <AppText variant="caption" color="textTertiary">
                  {WEEKDAY_SHORT[index]}
                </AppText>
                <View style={[styles.headerNumber, today ? { backgroundColor: theme.today } : null]}>
                  <AppText variant="label" tabular color={today ? 'onInk' : 'text'}>
                    {day.getDate()}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {hasAllDay ? (
        <View style={[styles.allDayRow, { borderBottomColor: theme.border }]}>
          <View style={{ width: GUTTER_WIDTH }}>
            <AppText variant="caption" color="textTertiary">
              día
            </AppText>
          </View>
          {days.map((day, index) => (
            <View key={toDayKey(day)} style={styles.allDayColumn}>
              {(allDay[index] ?? []).map((activity) => (
                <View key={activity.id} style={styles.allDayBlock}>
                  <ActivityBlock activity={activity} onPress={onPressActivity} compact={compact} shared={isSharedActivity?.(activity)} />
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.gutter, { width: GUTTER_WIDTH }]}>
          {HOURS.map((hour) => (
            <View key={hour} style={{ height: hourHeight }}>
              {hour > 0 ? (
                <AppText variant="caption" color="textTertiary" tabular style={styles.hourLabel}>
                  {formatHourLabel(hour)}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
        {days.map((day) => (
          <DayColumn
            key={toDayKey(day)}
            day={day}
            activities={activitiesByDay.get(toDayKey(day)) ?? []}
            hourHeight={hourHeight}
            compact={compact}
            theme={theme}
            onPressSlot={onPressSlot}
            onPressActivity={onPressActivity}
            isSharedActivity={isSharedActivity}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: Spacing.xs },
  headerDay: { flex: 1, alignItems: 'center', gap: 2 },
  headerNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  allDayRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.xs },
  allDayColumn: { flex: 1, gap: 2, paddingHorizontal: 1 },
  allDayBlock: { minHeight: 24 },
  scroll: { flex: 1 },
  scrollContent: { flexDirection: 'row', paddingTop: 10, paddingBottom: 80 },
  gutter: { paddingRight: Spacing.xs },
  hourLabel: { textAlign: 'right', marginTop: -8 },
  column: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, position: 'relative' },
  slot: { borderTopWidth: StyleSheet.hairlineWidth },
  blockWrapper: { position: 'absolute', paddingHorizontal: 1 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2 },
  nowDot: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 4 },
});
