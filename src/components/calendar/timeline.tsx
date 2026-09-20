import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActivityBlock } from './activity-block';
import { layoutDay } from './layout-blocks';

import { AppText } from '@/components/ui';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  formatHourLabel,
  formatMinutes,
  isToday,
  minutesSinceMidnight,
  SLOT_MINUTES,
  SLOTS_PER_DAY,
  toDayKey,
  WEEKDAY_SHORT,
} from '@/lib/dates';
import type { Activity } from '@/types/domain';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Rejilla de media hora: 48 slots de 00:00 a 23:30 (RF-C3, RF-C6). */
const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i * SLOT_MINUTES);
const GUTTER_WIDTH = 54;
const NOW_TICK_MS = 30_000;
/**
 * Alto mínimo de un bloque: una línea de `label` (20) más el relleno vertical.
 * Por debajo, el título se cortaría; una actividad de un minuto se pinta a este alto.
 */
const BASE_MIN_BLOCK_HEIGHT = 28;
const MAX_FONT_SCALE = 1.5;

/** Minutos transcurridos del día, refrescados mientras el timeline esté montado. */
function useNowMinutes(): number {
  const [minutes, setMinutes] = useState(() => minutesSinceMidnight(new Date()));
  useEffect(() => {
    const id = setInterval(() => setMinutes(minutesSinceMidnight(new Date())), NOW_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return minutes;
}

export type TimelineProps = {
  days: Date[];
  activitiesByDay: Map<string, Activity[]>;
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  hourHeight?: number;
  compact?: boolean;
  /** La vista diaria muestra solo el título en cada bloque. */
  titleOnly?: boolean;
  isSharedActivity?: (activity: Activity) => boolean;
};

type ColumnProps = {
  day: Date;
  /** La vista diaria muestra solo el título; la semanal mantiene la hora. */
  titleOnly: boolean;
  activities: Activity[];
  hourHeight: number;
  compact: boolean;
  theme: ThemeColors;
  /** Minutos del día en curso; `null` cuando la columna no es hoy. */
  nowMinutes: number | null;
  onPressSlot: (day: Date, minutes: number) => void;
  onPressActivity: (activity: Activity) => void;
  isSharedActivity?: (activity: Activity) => boolean;
};

const DayColumn = memo(function DayColumn({
  day,
  titleOnly,
  activities,
  hourHeight,
  compact,
  theme,
  nowMinutes,
  onPressSlot,
  onPressActivity,
  isSharedActivity,
}: ColumnProps) {
  const pxPerMinute = hourHeight / 60;
  const slotHeight = hourHeight / 2;
  const minBlockHeight = Math.round(BASE_MIN_BLOCK_HEIGHT * Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE));
  const minMinutes = minBlockHeight / pxPerMinute;
  const blocks = useMemo(() => layoutDay(activities, day, minMinutes), [activities, day, minMinutes]);

  return (
    <View style={[styles.column, { borderLeftColor: theme.border }]}>
      {SLOTS.map((minutes) => {
        const onTheHour = minutes % 60 === 0;
        return (
          <Pressable
            key={minutes}
            accessibilityRole="button"
            accessibilityLabel={`Crear actividad a las ${formatMinutes(minutes)}`}
            onPress={() => onPressSlot(day, minutes)}
            style={({ pressed }) => [
              styles.slot,
              // La línea de la hora manda; la de la media hora solo insinúa la subdivisión.
              { height: slotHeight, borderTopColor: onTheHour ? theme.border : theme.surfaceAlt },
              pressed ? { backgroundColor: theme.surfaceAlt } : null,
            ]}
          />
        );
      })}
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
                height: (block.visualEnd - block.start) * pxPerMinute - 2,
                left,
                width,
              },
            ]}>
            <ActivityBlock
              activity={block.activity}
              onPress={onPressActivity}
              compact={compact}
              titleOnly={titleOnly}
              shared={isSharedActivity?.(block.activity)}
            />
          </View>
        );
      })}
      {nowMinutes !== null ? (
        <View pointerEvents="none" style={[styles.nowLine, { top: nowMinutes * pxPerMinute, backgroundColor: theme.ink }]}>
          <View style={[styles.nowDot, { backgroundColor: theme.ink }]} />
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
  titleOnly = false,
  isSharedActivity,
}: TimelineProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const multiDay = days.length > 1;
  const pxPerMinute = hourHeight / 60;

  const todayKey = toDayKey(new Date());
  const showsToday = days.some((day) => isToday(day));
  const nowMinutes = useNowMinutes();

  // Abre centrado en la hora actual cuando hoy está a la vista; si no, en la mañana.
  useEffect(() => {
    const target = showsToday ? Math.max(0, nowMinutes * pxPerMinute - hourHeight * 2) : 8 * hourHeight;
    const id = setTimeout(() => scrollRef.current?.scrollTo({ y: target, animated: false }), 0);
    return () => clearTimeout(id);
    // Solo al cambiar de rango o de escala: después el scroll lo controla la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourHeight, days, showsToday]);

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
                <View style={[styles.headerNumber, today ? { backgroundColor: theme.ink } : null]}>
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
              <AppText variant="caption" color="textTertiary" tabular style={styles.hourLabel}>
                {formatHourLabel(hour)}
              </AppText>
            </View>
          ))}
          {showsToday ? (
            <View
              pointerEvents="none"
              accessible
              accessibilityLabel={`Hora actual, ${formatMinutes(nowMinutes)}`}
              style={[styles.nowPill, { top: nowMinutes * pxPerMinute - 9, backgroundColor: theme.ink }]}>
              <AppText variant="caption" tabular color="onInk">
                {formatMinutes(nowMinutes)}
              </AppText>
            </View>
          ) : null}
        </View>
        {days.map((day) => (
          <DayColumn
            key={toDayKey(day)}
            day={day}
            titleOnly={titleOnly}
            activities={activitiesByDay.get(toDayKey(day)) ?? []}
            hourHeight={hourHeight}
            compact={compact}
            theme={theme}
            nowMinutes={toDayKey(day) === todayKey ? nowMinutes : null}
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
  nowPill: {
    position: 'absolute',
    right: Spacing.xs,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  column: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, position: 'relative' },
  slot: { borderTopWidth: StyleSheet.hairlineWidth },
  blockWrapper: { position: 'absolute', paddingHorizontal: 1 },
  nowLine: { position: 'absolute', left: 0, right: 0, height: 2 },
  nowDot: { position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: 4 },
});
