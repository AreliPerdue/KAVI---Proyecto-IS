import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip, DatePickerSheet, FieldButton, Segmented, type SegmentedOption, SwitchRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDate, fromDayKey, toDayKey } from '@/lib/dates';
import { type RecurrenceFreq, type RecurrenceRule } from '@/lib/recurrence';

type FreqOption = 'NONE' | RecurrenceFreq;

const FREQ_OPTIONS: readonly SegmentedOption<FreqOption>[] = [
  { value: 'NONE', label: 'No' },
  { value: 'DAILY', label: 'Diaria' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
];

const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Sección de recurrencia del formulario (RF-C8). */
export function RecurrenceField({
  value,
  onChange,
  baseDayKey,
  disabled,
}: {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  baseDayKey: string;
  disabled?: boolean;
}) {
  const [pickingUntil, setPickingUntil] = useState(false);
  const freq: FreqOption = value?.freq ?? 'NONE';
  const baseDay = fromDayKey(baseDayKey);
  const baseWeekday = (baseDay.getDay() + 6) % 7;

  const setFreq = (next: FreqOption) => {
    if (next === 'NONE') return onChange(null);
    onChange({ freq: next, byDay: next === 'WEEKLY' ? (value?.byDay.length ? value.byDay : [baseWeekday]) : [], until: value?.until ?? null });
  };

  return (
    <View style={styles.container}>
      <AppText variant="label" color="textSecondary">
        Repetir
      </AppText>
      {disabled ? (
        <AppText color="textTertiary">La repetición se edita desde la serie completa.</AppText>
      ) : (
        <Segmented options={FREQ_OPTIONS} value={freq} onChange={setFreq} />
      )}

      {value?.freq === 'WEEKLY' && !disabled ? (
        <View style={styles.days}>
          {DAY_LABELS.map((label, index) => {
            const selected = value.byDay.includes(index);
            return (
              <Chip
                key={index}
                label={label}
                compact
                selected={selected}
                onPress={() => {
                  const byDay = selected ? value.byDay.filter((d) => d !== index) : [...value.byDay, index];
                  onChange({ ...value, byDay: byDay.length ? byDay : [index] });
                }}
              />
            );
          })}
        </View>
      ) : null}

      {value && !disabled ? (
        <>
          <SwitchRow
            label="Termina en una fecha"
            hint={value.until ? undefined : 'Si no, se repite sin fin (se generan 90 días por adelantado).'}
            value={value.until !== null}
            onValueChange={(on) => onChange({ ...value, until: on ? toDayKey(fromDayKey(baseDayKey)) : null })}
          />
          {value.until ? (
            <FieldButton label="Hasta" value={formatDate(fromDayKey(value.until))} onPress={() => setPickingUntil(true)} />
          ) : null}
          <DatePickerSheet
            visible={pickingUntil}
            value={value.until ? fromDayKey(value.until) : baseDay}
            title="Repetir hasta"
            onClose={() => setPickingUntil(false)}
            onSelect={(date) => {
              onChange({ ...value, until: toDayKey(date < baseDay ? baseDay : date) });
              setPickingUntil(false);
            }}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  days: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
});
