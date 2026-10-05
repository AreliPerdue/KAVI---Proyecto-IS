import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Sheet, SwitchRow, ThemeIcon } from '@/components/ui';
import { DIMENSIONS } from '@/constants/dimensions';
import { Spacing } from '@/constants/theme';
import { useThemes } from '@/hooks/use-themes';
import { type CalendarFilters, hasActiveFilters } from '@/store/calendar-store';
import { useLanguage, useT } from '@/i18n';
import { dimensionName, themeName } from '@/lib/theme-name';

/** Filtros por dimensión y tema, combinables, aplicados a las 5 vistas (RF-C11, RF-C18). */
export function FilterSheet({
  visible,
  filters,
  onClose,
  onChange,
  onClear,
}: {
  visible: boolean;
  filters: CalendarFilters;
  onClose: () => void;
  onChange: (filters: CalendarFilters) => void;
  onClear: () => void;
}) {
  const themes = useThemes();
  const tx = useT();
  const lang = useLanguage();
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <Sheet visible={visible} onClose={onClose} title={tx.themes.filters.title}>
      <View style={styles.section}>
        <AppText variant="label" color="textSecondary">
          {tx.themes.filters.dimension}
        </AppText>
        <View style={styles.chips}>
          {DIMENSIONS.map((d) => (
            <Chip
              key={d.key}
              label={dimensionName(d.key, lang)}
              color={d.color}
              selected={filters.dimensions.includes(d.key)}
              onPress={() => onChange({ ...filters, dimensions: toggle(filters.dimensions, d.key) })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="textSecondary">
          {tx.themes.picker.title}
        </AppText>
        <View style={styles.chips}>
          {(themes.data ?? []).map((t) => {
            const selected = filters.themeIds.includes(t.id);
            return (
              <Chip
                key={t.id}
                label={themeName(t, lang)}
                color={t.color}
                selected={selected}
                icon={<ThemeIcon name={t.icon} color={selected ? '#FFFFFF' : t.color} size={14} />}
                onPress={() => onChange({ ...filters, themeIds: toggle(filters.themeIds, t.id) })}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SwitchRow
          label={tx.themes.filters.onlyLists}
          hint={tx.themes.filters.onlyListsHint}
          value={filters.onlyListItems}
          onValueChange={(v) => onChange({ ...filters, onlyListItems: v })}
        />
      </View>

      <View style={styles.actions}>
        {hasActiveFilters(filters) ? <Button title={tx.themes.filters.clear} variant="secondary" onPress={onClear} /> : null}
        <Button title={tx.common.done} onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
