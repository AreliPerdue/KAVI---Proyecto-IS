import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { Segmented, type SegmentedOption } from './segmented';
import { Sheet } from './sheet';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes12 } from '@/lib/dates';

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
type Meridiem = 'am' | 'pm';
const MERIDIEM: readonly SegmentedOption<Meridiem>[] = [
  { value: 'am', label: 'AM' },
  { value: 'pm', label: 'PM' },
];

function split(minutes: number): { hour: number; minute: number; meridiem: Meridiem } {
  const h24 = Math.floor(minutes / 60) % 24;
  return { hour: h24 % 12 === 0 ? 12 : h24 % 12, minute: minutes % 60, meridiem: h24 < 12 ? 'am' : 'pm' };
}

function join(hour: number, minute: number, meridiem: Meridiem): number {
  const h24 = (hour % 12) + (meridiem === 'pm' ? 12 : 0);
  return h24 * 60 + minute;
}

function Column<T extends number>({
  data,
  value,
  onChange,
  format,
  label,
}: {
  data: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format: (v: T) => string;
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
    [value, onChange, format, label],
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

/** Selector de hora en formato 12 h: hora 1–12, minuto 0–59 y AM/PM. `value` en minutos desde medianoche. */
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
  const initial = useMemo(() => split(value), [value]);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [meridiem, setMeridiem] = useState<Meridiem>(initial.meridiem);

  useEffect(() => {
    if (visible) {
      setHour(initial.hour);
      setMinute(initial.minute);
      setMeridiem(initial.meridiem);
    }
  }, [visible, initial]);

  const current = join(hour, minute, meridiem);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.7}>
      <AppText variant="display" tabular style={styles.preview}>
        {formatMinutes12(current)}
      </AppText>
      <View style={styles.columns}>
        <Column data={HOURS} value={hour} onChange={setHour} format={(h) => String(h)} label="Hora" />
        <AppText variant="display" color="textTertiary" style={styles.colon}>
          :
        </AppText>
        <Column data={MINUTES} value={minute} onChange={setMinute} format={(m) => m.toString().padStart(2, '0')} label="Minuto" />
      </View>
      <Segmented options={MERIDIEM} value={meridiem} onChange={setMeridiem} />
      <Button title="Listo" onPress={() => onSelect(current)} />
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
