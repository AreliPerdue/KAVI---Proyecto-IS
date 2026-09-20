import { memo, useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { activityColor, tint } from './activity-style';
import { groupByDay } from './group-by-day';
import { isOverlayActivity } from './overlay';

import { AppText } from '@/components/ui';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayTitle, formatTime, fromIso, isSameMonth, isToday, monthGridDays, toDayKey, WEEKDAY_LABELS } from '@/lib/dates';
import type { Activity } from '@/types/domain';

const WEEKS = 6;
const DAYS_PER_WEEK = 7;

/** Medidas base en dp; se escalan con el tamaño de fuente del sistema. */
const BASE_CHIP_HEIGHT = 20;
/** Los chips crecen para repartirse el hueco sobrante, hasta este alto. */
const MAX_CHIP_HEIGHT = 28;
const BASE_DAY_NUMBER_HEIGHT = 26;
const CHIP_GAP = 3;
/** Tope de escala: por encima el mes dejaría de caber en pantallas bajas. */
const MAX_FONT_SCALE = 1.5;
/** Ancho de celda a partir del cual la hora cabe junto al título. */
const TIME_MIN_CELL_WIDTH = 72;
const MAX_MORE_DOTS = 4;
const MAX_DENSE_DOTS = 5;
/** Altura mínima para la fila de puntos del modo compacto. */
const DENSE_ROW_HEIGHT = 10;

type Metrics = {
  /** Chips (o filas de contenido) que caben en la celda. 0 = modo compacto. */
  slots: number;
  chipHeight: number;
  dayNumberHeight: number;
  showTime: boolean;
  dense: boolean;
};

type DayCellProps = {
  date: Date;
  inMonth: boolean;
  weekend: boolean;
  activities: Activity[];
  theme: ThemeColors;
  metrics: Metrics;
  onPress: (date: Date) => void;
};

const DayCell = memo(function DayCell({ date, inMonth, weekend, activities, theme, metrics, onPress }: DayCellProps) {
  const today = isToday(date);
  const count = activities.length;
  const { slots, chipHeight, dayNumberHeight, showTime, dense } = metrics;

  // Con más actividades que huecos, el último hueco lo ocupa el resumen "+N".
  const overflow = !dense && count > slots ? count - (slots - 1) : 0;
  const visible = dense ? [] : overflow > 0 ? activities.slice(0, slots - 1) : activities;
  const hidden = overflow > 0 ? activities.slice(visible.length) : [];
  const label = `${formatDayTitle(date)}, ${count === 0 ? 'sin actividades' : `${count} ${count === 1 ? 'actividad' : 'actividades'}`}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(date)}
      style={({ pressed }) => [
        styles.cell,
        today ? { backgroundColor: theme.surfaceAlt } : weekend ? { backgroundColor: tint(theme.text, 0.035) } : null,
        pressed ? { backgroundColor: tint(theme.text, 0.09) } : null,
      ]}>
      <View style={[styles.dayNumberRow, { height: dayNumberHeight }]}>
        <View
          style={[
            styles.dayNumber,
            { minWidth: dayNumberHeight - 2, height: dayNumberHeight - 2, borderRadius: (dayNumberHeight - 2) / 2 },
            // Hoy se marca con el bloque de máximo contraste; el número va en `onInk`.
            today ? { backgroundColor: theme.ink } : null,
          ]}>
          <AppText
            variant="label"
            tabular
            numberOfLines={1}
            color={today ? 'onInk' : inMonth ? 'text' : 'textTertiary'}
            style={today ? styles.todayText : null}>
            {date.getDate()}
          </AppText>
        </View>
      </View>

      {dense ? (
        count > 0 ? (
          <View style={styles.denseRow}>
            {activities.slice(0, MAX_DENSE_DOTS).map((activity) => (
              <View key={activity.id} style={[styles.denseDot, { backgroundColor: activityColor(activity, theme) }]} />
            ))}
          </View>
        ) : null
      ) : (
        <View style={styles.chips}>
          {visible.map((activity) => {
            const color = activityColor(activity, theme);
            const foreign = isOverlayActivity(activity) || !!activity.owner_name;
            return (
              <View
                key={activity.id}
                style={[
                  styles.chip,
                  { height: chipHeight, backgroundColor: tint(color, foreign ? 0.35 : 0.18), borderLeftColor: color },
                  foreign ? { borderStyle: 'dashed', borderWidth: 1, borderColor: color, borderLeftWidth: 2 } : null,
                ]}>
                <AppText variant="caption" numberOfLines={1} color={inMonth ? 'text' : 'textSecondary'}>
                  {showTime && !activity.all_day ? (
                    <AppText variant="caption" color="textSecondary" tabular>
                      {formatTime(fromIso(activity.start_at))}{' '}
                    </AppText>
                  ) : null}
                  {activity.title}
                </AppText>
              </View>
            );
          })}
          {overflow > 0 ? (
            <View style={[styles.moreRow, { height: chipHeight }]}>
              {hidden.slice(0, MAX_MORE_DOTS).map((activity) => (
                <View key={activity.id} style={[styles.moreDot, { backgroundColor: activityColor(activity, theme) }]} />
              ))}
              <AppText variant="caption" color="textSecondary">
                +{overflow}
              </AppText>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
});

export type MonthViewProps = {
  anchor: Date;
  activities: readonly Activity[];
  onSelectDay: (date: Date) => void;
};

/**
 * Vista mensual: 6 semanas × 7 días (RF-C1).
 *
 * La rejilla se arma con filas y `flex: 1` en vez de anchos en porcentaje: `100/7`
 * redondeado sumaba más de 100 % en algunas densidades de Android y el séptimo día
 * saltaba de fila. Las 6 filas se reparten la altura disponible, así que el mes entra
 * completo en cualquier pantalla en vez de recortarse por abajo (NFR-8, NFR-9).
 * Cuántas actividades se muestran por día depende del alto real de la celda; si no
 * cabe ni un chip, el día se resume en puntos de color.
 */
export function MonthView({ anchor, activities, onSelectDay }: MonthViewProps) {
  const theme = useTheme();
  const byDay = useMemo(() => groupByDay(activities), [activities]);
  const handlePress = useCallback((date: Date) => onSelectDay(date), [onSelectDay]);

  const weeks = useMemo(() => {
    const days = monthGridDays(anchor);
    return Array.from({ length: WEEKS }, (_, i) => days.slice(i * DAYS_PER_WEEK, (i + 1) * DAYS_PER_WEEK));
  }, [anchor]);

  const [grid, setGrid] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setGrid((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const metrics = useMemo<Metrics>(() => {
    const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
    const chipHeight = Math.round(BASE_CHIP_HEIGHT * fontScale);
    const dayNumberHeight = Math.round(BASE_DAY_NUMBER_HEIGHT * fontScale);
    const rowHeight = grid.height / WEEKS;
    const cellWidth = grid.width / DAYS_PER_WEEK;
    const free = rowHeight - dayNumberHeight - CHIP_GAP;
    const slots = Math.max(0, Math.floor(free / (chipHeight + CHIP_GAP)));
    // Reparte el sobrante entre los chips que caben: dejarlos en su alto mínimo
    // vaciaba la mitad inferior de cada celda.
    const grown = slots > 0 ? Math.floor((free - (slots - 1) * CHIP_GAP) / slots) : chipHeight;
    return {
      slots,
      chipHeight: Math.max(chipHeight, Math.min(Math.round(MAX_CHIP_HEIGHT * fontScale), grown)),
      dayNumberHeight,
      showTime: cellWidth >= TIME_MIN_CELL_WIDTH,
      dense: slots === 0 && free >= DENSE_ROW_HEIGHT,
    };
  }, [grid.height, grid.width]);

  // Hasta la primera medición no se sabe cuántas actividades caben; pintar la rejilla
  // vacía evita el salto de ver chips y que desaparezcan al recalcular.
  const measured = grid.height > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.weekHeader, { borderBottomColor: theme.border }]}>
        {WEEKDAY_LABELS.map((label, index) => (
          <AppText
            key={index}
            variant="caption"
            color={index >= 5 ? 'textSecondary' : 'textTertiary'}
            style={styles.weekHeaderText}>
            {label}
          </AppText>
        ))}
      </View>
      <View style={styles.grid} onLayout={onLayout}>
        {weeks.map((week, weekIndex) => (
          <View
            key={toDayKey(week[0] as Date)}
            style={[styles.week, weekIndex > 0 ? { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
            {week.map((date, dayIndex) => (
              <View
                key={toDayKey(date)}
                style={[
                  styles.cellWrapper,
                  dayIndex > 0 ? { borderLeftColor: theme.border, borderLeftWidth: StyleSheet.hairlineWidth } : null,
                ]}>
                <DayCell
                  date={date}
                  inMonth={isSameMonth(date, anchor)}
                  weekend={dayIndex >= 5}
                  activities={measured ? (byDay.get(toDayKey(date)) ?? []) : []}
                  theme={theme}
                  metrics={metrics}
                  onPress={handlePress}
                />
              </View>
            ))}
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
  grid: { flex: 1 },
  week: { flex: 1, flexDirection: 'row' },
  cellWrapper: { flex: 1 },
  cell: { flex: 1, paddingHorizontal: 2, paddingBottom: 2, overflow: 'hidden' },
  dayNumberRow: { alignItems: 'center', justifyContent: 'center' },
  dayNumber: { paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  todayText: { fontWeight: '700' },
  chips: { gap: CHIP_GAP },
  chip: {
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    borderLeftWidth: 3,
    paddingHorizontal: 4,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  moreDot: { width: 6, height: 6, borderRadius: 3 },
  denseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: DENSE_ROW_HEIGHT },
  denseDot: { width: 6, height: 6, borderRadius: 3 },
});
