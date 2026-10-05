import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { IconButton } from './icon-button';
import { Sheet } from './sheet';

import { useLanguage, useT } from '@/i18n';
import { IconSize, IconStroke, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayTitle, formatMonthTitle, isSameDay, isSameMonth, isToday, monthGridDays, shiftAnchor, toDayKey, weekdayLabels } from '@/lib/dates';

/** Selector de fecha propio (funciona igual en iOS, Android y web). */
export function DatePickerSheet({
  visible,
  value,
  onClose,
  onSelect,
  title,
}: {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
  title?: string;
}) {
  const lang = useLanguage(); // fechas en el idioma activo (spec 12, RF-I2)
  const tx = useT();
  const theme = useTheme();
  const [anchor, setAnchor] = useState(value);
  const days = monthGridDays(anchor);

  return (
    <Sheet visible={visible} onClose={onClose} title={title ?? tx.calendar.datePickerTitle}>
      <View style={styles.monthRow}>
        <IconButton label={tx.calendar.previousMonth} onPress={() => setAnchor(shiftAnchor('month', anchor, -1))}>
          <ChevronLeft size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
        <AppText variant="bodyStrong">{formatMonthTitle(anchor, lang)}</AppText>
        <IconButton label={tx.calendar.nextMonth} onPress={() => setAnchor(shiftAnchor('month', anchor, 1))}>
          <ChevronRight size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
        </IconButton>
      </View>
      <View style={styles.weekHeader}>
        {weekdayLabels(lang).map((label, i) => (
          <AppText key={i} variant="caption" color="textTertiary" style={styles.cellText}>
            {label}
          </AppText>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const selected = isSameDay(day, value);
          const today = isToday(day);
          return (
            <Pressable
              key={toDayKey(day)}
              accessibilityRole="button"
              accessibilityLabel={formatDayTitle(day, lang)}
              accessibilityState={{ selected }}
              onPress={() => onSelect(day)}
              style={({ pressed }) => [styles.cell, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
              <View style={[styles.dayCircle, selected ? { backgroundColor: theme.ink } : today ? { borderWidth: 1.5, borderColor: theme.today } : null]}>
                <AppText variant="label" tabular color={selected ? 'onInk' : isSameMonth(day, anchor) ? 'text' : 'textTertiary'}>
                  {day.getDate()}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekHeader: { flexDirection: 'row' },
  cellText: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
