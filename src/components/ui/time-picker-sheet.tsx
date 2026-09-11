import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { Sheet } from './sheet';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes } from '@/lib/dates';

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Minuto a minuto: se puede agendar a las 14:07 igual que a las 14:00 (RF-C5). */
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (value: number) => value.toString().padStart(2, '0');

function Column<T extends number>({
  data,
  value,
  onChange,
  label,
}: {
  data: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
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
          accessibilityLabel={`${label} ${pad(item)}`}
          accessibilityState={{ selected }}
          onPress={() => onChange(item)}
          style={styles.item}>
          <AppText variant={selected ? 'heading' : 'body'} color={selected ? 'text' : 'textTertiary'} tabular>
            {pad(item)}
          </AppText>
        </Pressable>
      );
    },
    [value, onChange, label],
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
  const [hour, setHour] = useState(() => Math.floor(value / 60) % 24);
  const [minute, setMinute] = useState(() => value % 60);
  const current = hour * 60 + minute;

  return (
    <>
      <AppText variant="display" tabular style={styles.preview}>
        {formatMinutes(current)}
      </AppText>
      <View style={styles.columns}>
        <Column data={HOURS} value={hour} onChange={setHour} label="Hora" />
        <AppText variant="display" color="textTertiary" style={styles.colon}>
          :
        </AppText>
        <Column data={MINUTES} value={minute} onChange={setMinute} label="Minuto" />
      </View>
      <Button title="Listo" onPress={() => onSelect(current)} />
    </>
  );
}

/** Selector de hora en formato 24 h: hora 00–23 y minuto 00–59. `value` en minutos desde medianoche. */
export function TimePickerSheet({
  visible,
  value,
  onClose,
  onSelect,
  title = 'Hora',
}: {
  visible: boolean;
  value: number;
  onClose: () => void;
  onSelect: (minutes: number) => void;
  title?: string;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.7}>
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
