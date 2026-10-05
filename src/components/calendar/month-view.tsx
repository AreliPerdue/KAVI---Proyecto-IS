import { memo, useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { activityColor, lowContrastOutline, tint } from './activity-style';
import { isListDerived } from './derived';
import { groupByDay } from './group-by-day';
import { isOverlayActivity } from './overlay';

import { AppText, ThemeIcon } from '@/components/ui';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayTitle, formatTime, fromIso, isSameMonth, isToday, monthGridDays, toDayKey, WEEKDAY_LABELS } from '@/lib/dates';
import type { Activity } from '@/types/domain';

const WEEKS = 6;
/**
 * Ancho de rejilla a partir del cual el número del día se alinea a la derecha.
 *
 * Es por ancho y no por plataforma: el navegador en un teléfono es `web` igual que en
 * el escritorio, así que ramificar por plataforma le daba la versión de escritorio a una
 * pantalla de 390 px. Por ancho, el navegador angosto y la app nativa coinciden, que es
 * lo que la persona espera al ver la misma app en los dos sitios (NFR-9).
 */
const WIDE_GRID = 700;
const DAYS_PER_WEEK = 7;

/** Medidas base en dp; se escalan con el tamaño de fuente del sistema. */
const BASE_CHIP_HEIGHT = 18;
/**
 * Los chips crecen apenas para repartirse el hueco sobrante.
 *
 * Antes llegaban a 28 y en pantallas grandes se inflaban hasta ahí siempre, que es lo
 * que los hacía verse gordos: la celda se llenaba con dos pastillas altas en vez de
 * con cuatro delgadas. Calendar y Google Calendar mantienen la píldora a alto fijo y
 * dejan el sobrante en blanco; el tope bajo imita eso y de paso hace que quepan más.
 */
const MAX_CHIP_HEIGHT = 20;
const BASE_DAY_NUMBER_HEIGHT = 26;
const CHIP_GAP = 2;
/** Tope de escala: por encima el mes dejaría de caber en pantallas bajas. */
const MAX_FONT_SCALE = 1.5;
/** Ancho de celda a partir del cual la hora cabe junto al título. */
const TIME_MIN_CELL_WIDTH = 72;
const MAX_MORE_DOTS = 4;
const MAX_DENSE_DOTS = 5;
/** Alto de la fila de puntos del modo compacto; se encoge si el hueco es menor. */
const DENSE_ROW_HEIGHT = 10;
const DOT_SIZE = 6;
/**
 * Alto de la fila "+N" bajo los chips. Es más baja que un chip (lleva `micro`, no una
 * píldora), y eso es lo que deja sitio para un chip más cuando el día se desborda.
 */
const BASE_MORE_ROW_HEIGHT = 14;

type Metrics = {
  /** Chips que caben en la celda sin desborde. 0 = modo compacto. */
  slots: number;
  /** Alto disponible bajo el número del día. */
  free: number;
  chipHeight: number;
  moreRowHeight: number;
  dayNumberHeight: number;
  showTime: boolean;
  dense: boolean;
  denseRowHeight: number;
  /** Calendar de macOS alinea el número a la derecha; Google Calendar lo centra. */
  alignEnd: boolean;
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

/**
 * Cuántos chips pinta una celda y dónde va el resumen de lo que no cabe (T204).
 *
 * Antes, con desborde, el "+N" ocupaba un hueco de chip entero: con un solo hueco no
 * quedaba ningún chip y la celda era una fila de puntos, sin una sola actividad legible.
 * Ahora se calcula en dos pasos: si todo cabe, todo; si no, cuántos chips caben dejando
 * debajo la fila "+N", que es más baja que un chip; y si ni así cabe uno, se pinta uno y
 * el "+N" sube a la fila del número del día, en la esquina libre, para que el chip
 * conserve todo su ancho. Siempre que quepa un chip, hay al menos uno.
 */
export function cellLayout(
  count: number,
  metrics: Pick<Metrics, 'slots' | 'free' | 'chipHeight' | 'moreRowHeight'>,
): { chips: number; more: 'row' | 'header' | null } {
  const { slots, free, chipHeight, moreRowHeight } = metrics;
  if (slots === 0) return { chips: 0, more: null };
  if (count <= slots) return { chips: count, more: null };
  const conFila = Math.floor((free - moreRowHeight) / (chipHeight + CHIP_GAP));
  return conFila >= 1 ? { chips: conFila, more: 'row' } : { chips: 1, more: 'header' };
}

const DayCell = memo(function DayCell({ date, inMonth, weekend, activities, theme, metrics, onPress }: DayCellProps) {
  const today = isToday(date);
  const count = activities.length;
  const { chipHeight, moreRowHeight, dayNumberHeight, showTime, dense, alignEnd } = metrics;

  const layout = dense ? { chips: 0, more: null } : cellLayout(count, metrics);
  const visible = activities.slice(0, layout.chips);
  const hidden = activities.slice(visible.length);
  const overflow = layout.more ? hidden.length : 0;
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
      <View
        style={[
          styles.dayNumberRow,
          { height: dayNumberHeight, alignItems: alignEnd ? 'flex-end' : 'center' },
        ]}>
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
        {layout.more === 'header' ? (
          <View pointerEvents="none" style={[styles.headerMore, alignEnd ? styles.headerMoreStart : styles.headerMoreEnd]}>
            <AppText variant="micro" color="textSecondary" tabular>
              +{overflow}
            </AppText>
          </View>
        ) : null}
      </View>

      {dense ? (
        count > 0 ? (
          <View style={[styles.denseRow, { height: metrics.denseRowHeight }]}>
            {activities.slice(0, MAX_DENSE_DOTS).map((activity) => (
              <View key={activity.id} style={[styles.denseDot, { backgroundColor: activityColor(activity, theme) }, lowContrastOutline(activityColor(activity, theme), theme)]} />
            ))}
          </View>
        ) : null
      ) : (
        <View style={styles.chips}>
          {visible.map((activity) => {
            const color = activityColor(activity, theme);
            const foreign = isOverlayActivity(activity) || !!activity.owner_name;
            // Un pendiente de lista no lleva hora: lleva su círculo, que de un vistazo dice
            // que eso no es una cita sino algo por hacer (RF-L12).
            const esPendiente = isListDerived(activity);
            return (
              <View
                key={activity.id}
                style={[
                  styles.chip,
                  { height: chipHeight, backgroundColor: tint(color, foreign ? 0.35 : 0.18), borderLeftColor: color },
                  lowContrastOutline(color, theme),
                  foreign ? { borderStyle: 'dashed', borderWidth: 1, borderColor: color, borderLeftWidth: 2 } : null,
                ]}>
                <AppText variant="caption" numberOfLines={1} color={inMonth ? 'text' : 'textSecondary'}>
                  {esPendiente ? <ThemeIcon name={activity.icon} color={color} size={11} /> : null}
                  {esPendiente ? ' ' : null}
                  {showTime && !activity.all_day ? (
                    // La hora cede un punto frente al título: es el dato de apoyo, y
                    // cada píxel que suelta es una letra más de título que se alcanza
                    // a leer antes de los puntos suspensivos.
                    <AppText variant="micro" color="textSecondary" tabular>
                      {formatTime(fromIso(activity.start_at))}{' '}
                    </AppText>
                  ) : null}
                  {activity.title}
                </AppText>
              </View>
            );
          })}
          {layout.more === 'row' ? (
            <View style={[styles.moreRow, { height: moreRowHeight }]}>
              {hidden.slice(0, MAX_MORE_DOTS).map((activity) => (
                <View key={activity.id} style={[styles.moreDot, { backgroundColor: activityColor(activity, theme) }, lowContrastOutline(activityColor(activity, theme), theme)]} />
              ))}
              <AppText variant="micro" color="textSecondary" tabular>
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
    const finalChipHeight = Math.max(chipHeight, Math.min(Math.round(MAX_CHIP_HEIGHT * fontScale), grown));
    const moreRowHeight = Math.round(BASE_MORE_ROW_HEIGHT * fontScale);
    // Con un solo chip y sin sitio para la fila "+N", el resumen sube junto al número
    // (`cellLayout`). Centrado, el número no le deja esquina libre en una celda angosta;
    // alineado a la derecha sí, y se alinea en toda la rejilla para que no baile.
    const resumenArriba = cellLayout(slots + 1, { slots, free, chipHeight: finalChipHeight, moreRowHeight }).more === 'header';
    return {
      slots,
      free,
      chipHeight: finalChipHeight,
      moreRowHeight,
      dayNumberHeight,
      showTime: cellWidth >= TIME_MIN_CELL_WIDTH,
      // Sin sitio para un chip, el día se resume en puntos aunque el hueco sea más bajo que
      // la fila: en un teléfono acostado quedan ~8 px y antes no se pintaba nada.
      dense: slots === 0 && free >= DOT_SIZE,
      denseRowHeight: Math.min(DENSE_ROW_HEIGHT, Math.max(DOT_SIZE, free)),
      alignEnd: grid.width >= WIDE_GRID || resumenArriba,
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
  headerMore: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  headerMoreStart: { left: 4 },
  headerMoreEnd: { right: 3 },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  moreDot: { width: 6, height: 6, borderRadius: 3 },
  denseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  denseDot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
});
