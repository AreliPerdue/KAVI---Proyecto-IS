import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip, DateInputSheet, FieldButton, Segmented, SwitchRow } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { formatDate, fromDayKey, toDayKey, weekdayLabels } from '@/lib/dates';
import { type RecurrenceFreq, type RecurrenceRule } from '@/lib/recurrence';
import { useLanguage, useT } from '@/i18n';

type FreqOption = 'NONE' | RecurrenceFreq;

const FRECUENCIAS: readonly FreqOption[] = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'];

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
  const tx = useT();
  const lang = useLanguage();
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
        {tx.calendar.repeat}
      </AppText>
      {disabled ? (
        <AppText color="textTertiary">{tx.calendar.repeatEditFromSeries}</AppText>
      ) : (
        <Segmented options={FRECUENCIAS.map((f) => ({ value: f, label: tx.calendar.repeatOptions[f] }))} value={freq} onChange={setFreq} />
      )}

      {value && !disabled ? (
        <AppText variant="caption" color="textTertiary">
          {tx.calendar.repeatStarts(formatDate(baseDay, lang))}
        </AppText>
      ) : null}

      {value?.freq === 'WEEKLY' && !disabled ? (
        <View style={styles.days}>
          {weekdayLabels(lang).map((label, index) => {
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
            label={tx.calendar.repeatEndsOnDate}
            hint={value.until ? undefined : tx.calendar.repeatEndsHint}
            value={value.until !== null}
            onValueChange={(on) => onChange({ ...value, until: on ? toDayKey(fromDayKey(baseDayKey)) : null })}
          />
          {value.until ? (
            <FieldButton label={tx.calendar.repeatUntil} value={formatDate(fromDayKey(value.until), lang)} onPress={() => setPickingUntil(true)} />
          ) : null}
          <DateInputSheet
            visible={pickingUntil}
            value={value.until ? fromDayKey(value.until) : null}
            title={tx.calendar.repeatUntilTitle}
            onClose={() => setPickingUntil(false)}
            onSelect={(date) => {
              // Terminar antes de empezar no significa nada: se empuja al día base.
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
