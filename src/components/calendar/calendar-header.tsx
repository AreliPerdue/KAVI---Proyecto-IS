import { ChevronDown, ChevronLeft, ChevronRight, CircleCheck, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { type Language, useLanguage, useT } from '@/i18n';
import { AppText, DatePickerSheet, IconButton } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useModuleNav } from '@/hooks/use-modules';
import { useTheme } from '@/hooks/use-theme';
import { ViewSwitcher } from './view-switcher';

import { type CalendarView, formatDayTitle, formatMonthTitle, formatThreeDaysTitle, formatWeekTitle } from '@/lib/dates';

/** El título dice de qué periodo se está hablando, y eso cambia con la vista. */
function tituloDe(view: CalendarView, anchor: Date, lang: Language): string {
  switch (view) {
    case 'month':
    // La agenda abarca el mes, así que se encabeza igual.
    case 'agenda':
      return formatMonthTitle(anchor, lang);
    case 'week':
      return formatWeekTitle(anchor, lang);
    case 'threeDays':
      return formatThreeDaysTitle(anchor, lang);
    case 'day':
      return formatDayTitle(anchor, lang);
  }
}

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
  const lang = useLanguage();
  const tx = useT();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const compacto = !wide;
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const { abrir: abrirModulo } = useModuleNav();
  const title = tituloDe(view, anchor, lang);

  /*
   * En angosto el encabezado se parte en dos filas: título arriba, controles abajo.
   *
   * En una sola fila, el mes competía por el ancho con Hoy, Listas, el selector de vista
   * y los filtros, y terminaba cortado —"Septie…"—, que es justo el dato que dice dónde
   * estás parada. Partirlo cuesta una franja de alto y devuelve el título entero.
   */
  const cuerpo = (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tx.calendar.changeDate(title)}
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
            <IconButton label={tx.calendar.previous} onPress={onPrev}>
              <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
            <IconButton label={tx.calendar.next} onPress={onNext}>
              <ChevronRight size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
            </IconButton>
          </>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx.calendar.goToToday}
          onPress={onToday}
          style={({ pressed }) => [styles.todayButton, { borderColor: theme.border }, pressed ? styles.pressed : null]}>
          <AppText variant="label">{tx.calendar.today}</AppText>
        </Pressable>
        {/*
          Entrada a Lists desde el calendario (spec 10, §UI): el mismo patrón con el
          que Fitness se abre desde una actividad de gimnasio. Va antes del selector
          de vistas porque pertenece al contenido del día, no a cómo se dibuja.
        */}
        <IconButton label={tx.calendar.lists} onPress={() => abrirModulo('lists')}>
          <CircleCheck size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <ViewSwitcher view={view} onChange={onChangeView} compact={!wide} />
        {onOpenFilters ? (
          <IconButton label={activeFilterCount > 0 ? tx.calendar.filtersActive(activeFilterCount) : tx.calendar.filters} onPress={onOpenFilters}>
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
        title={tx.calendar.goToDate}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={(date) => {
          onChangeAnchor(date);
          setMonthPickerOpen(false);
        }}
      />
    </>
  );

  return compacto ? (
    <View style={styles.columna}>{cuerpo}</View>
  ) : (
    <View style={styles.row}>{cuerpo}</View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  /* Angosto: título arriba con todo el ancho, controles en su propio renglón. */
  columna: { gap: Spacing.xs, alignItems: 'flex-start' },
  titleButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexShrink: 1, minHeight: 44 },
  title: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  todayButton: { minHeight: 36, paddingHorizontal: Spacing.md, borderWidth: 1, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  filterDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4 },
  pressed: { opacity: 0.7 },
});
