import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { AppText } from './app-text';
import { Sheet } from './sheet';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEP = 15;
const ITEM_HEIGHT = 44;

const SLOTS = Array.from({ length: (24 * 60) / STEP }, (_, i) => i * STEP);

function label(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Selector de hora en pasos de 15 min, multiplataforma. `value` en minutos desde medianoche. */
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
  const theme = useTheme();
  const initialIndex = useMemo(() => Math.max(0, Math.round(value / STEP) - 2), [value]);

  const renderItem = useCallback(
    ({ item }: { item: number }) => {
      const selected = item === value;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label(item)}
          accessibilityState={{ selected }}
          onPress={() => onSelect(item)}
          style={({ pressed }) => [
            styles.item,
            selected ? { backgroundColor: theme.ink } : null,
            pressed && !selected ? { backgroundColor: theme.surfaceAlt } : null,
          ]}>
          <AppText tabular variant={selected ? 'bodyStrong' : 'body'} color={selected ? 'onInk' : 'text'}>
            {label(item)}
          </AppText>
        </Pressable>
      );
    },
    [value, onSelect, theme],
  );

  return (
    <Sheet visible={visible} onClose={onClose} title={title} maxHeightRatio={0.6}>
      <FlatList
        data={SLOTS}
        keyExtractor={(item) => String(item)}
        renderItem={renderItem}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        style={styles.list}
        nestedScrollEnabled
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { height: 320 },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
});
