import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { Sheet } from './sheet';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Segmented } from './segmented';

import { formatMinutes, getTimeFormat } from '@/lib/dates';
import { useLanguage, useT } from '@/i18n';

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** En 12 h la rueda va de 12 a 11, como un reloj; a.m. o p.m. se elige aparte. */
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
/** Minuto a minuto: se puede agendar a las 14:07 igual que a las 14:00 (RF-C5). */
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (value: number) => value.toString().padStart(2, '0');

function Column<T extends number>({
  data,
  value,
  onChange,
  label,
  format = pad,
}: {
  data: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  format?: (v: T) => string;
}) {
  const theme = useTheme();
  const listRef = useRef<FlatList<T>>(null);
  const index = Math.max(0, data.indexOf(value));

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
    // Solo al montar: después el scroll lo controla la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: T }) => {
      const selected = item === value;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} ${format(item)}`}
          accessibilityState={{ selected }}
          onPress={() => onChange(item)}
          style={styles.item}>
          <AppText variant={selected ? 'heading' : 'body'} color={selected ? 'text' : 'textTertiary'} tabular>
            {format(item)}
          </AppText>
        </Pressable>
      );
    },
    [value, onChange, label, format],
  );

  return (
    <View style={styles.column}>
      <View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.surfaceAlt }]} />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => String(item)}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const item = data[Math.min(Math.max(i, 0), data.length - 1)];
          if (item !== undefined && item !== value) onChange(item);
        }}
        style={styles.list}
        nestedScrollEnabled
      />
    </View>
  );
}

function TimePickerBody({ value, onSelect }: { value: number; onSelect: (minutes: number) => void }) {
  const tx = useT();
  const lang = useLanguage();
  const [hour, setHour] = useState(() => Math.floor(value / 60) % 24);
  const [minute, setMinute] = useState(() => value % 60);
  const current = hour * 60 + minute;
  // Con reloj de 12 h la rueda muestra 12–11 y a.m./p.m. va aparte; por dentro sigue 0–23.
  const doce = getTimeFormat() === '12h';
  const pm = hour >= 12;

  return (
    <>
      <AppText variant="display" tabular style={styles.preview}>
        {formatMinutes(current, lang)}
      </AppText>
      <View style={styles.columns}>
        {doce ? (
          <Column data={HOURS_12} value={hour % 12 === 0 ? 12 : hour % 12} onChange={(h) => setHour((h % 12) + (pm ? 12 : 0))} label={tx.common.hour} format={String} />
        ) : (
          <Column data={HOURS} value={hour} onChange={setHour} label={tx.common.hour} />
        )}
        <AppText variant="display" color="textTertiary" style={styles.colon}>
          :
        </AppText>
        <Column data={MINUTES} value={minute} onChange={setMinute} label={tx.common.minute} />
      </View>
      {doce ? (
        <Segmented
          fullWidth
          options={[{ value: 'am', label: tx.dates.am }, { value: 'pm', label: tx.dates.pm }]}
          value={pm ? 'pm' : 'am'}
          onChange={(v) => setHour((hour % 12) + (v === 'pm' ? 12 : 0))}
        />
      ) : null}
      <Button title={tx.common.done} onPress={() => onSelect(current)} />
    </>
  );
}

/**
 * Selector de hora: hora y minuto en rueda, con a.m./p.m. si la preferencia es de 12 h.
 * `value` y lo que devuelve son minutos desde medianoche (0–1439) en los dos formatos.
 */
export function TimePickerSheet({
  visible,
  value,
  onClose,
  onSelect,
  title,
}: {
  visible: boolean;
  value: number;
  onClose: () => void;
  onSelect: (minutes: number) => void;
  title?: string;
}) {
  const tx = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={title ?? tx.common.time} maxHeightRatio={0.7}>
      {/* Se remonta al abrir para partir siempre del valor actual. */}
      {visible ? <TimePickerBody key={value} value={value} onSelect={onSelect} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: { textAlign: 'center' },
  columns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  column: { width: 96, height: ITEM_HEIGHT * VISIBLE },
  list: { flex: 1 },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE / 2),
    height: ITEM_HEIGHT,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  colon: { marginBottom: 6 },
});
