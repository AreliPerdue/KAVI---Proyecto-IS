import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Sheet, SwitchRow, ThemeIcon } from '@/components/ui';
import { DIMENSIONS } from '@/constants/dimensions';
import { Spacing } from '@/constants/theme';
import { useThemes } from '@/hooks/use-themes';
import { type CalendarFilters, hasActiveFilters } from '@/store/calendar-store';

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
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Filtros">
      <View style={styles.section}>
        <AppText variant="label" color="textSecondary">
          Dimensión
        </AppText>
        <View style={styles.chips}>
          {DIMENSIONS.map((d) => (
            <Chip
              key={d.key}
              label={d.label}
              color={d.color}
              selected={filters.dimensions.includes(d.key)}
              onPress={() => onChange({ ...filters, dimensions: toggle(filters.dimensions, d.key) })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="textSecondary">
          Tema
        </AppText>
        <View style={styles.chips}>
          {(themes.data ?? []).map((t) => {
            const selected = filters.themeIds.includes(t.id);
            return (
              <Chip
                key={t.id}
                label={t.name}
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
          label="Solo pendientes de listas"
          hint="Esconde las actividades y deja lo que tienes que hacer."
          value={filters.onlyListItems}
          onValueChange={(v) => onChange({ ...filters, onlyListItems: v })}
        />
      </View>

      <View style={styles.actions}>
        {hasActiveFilters(filters) ? <Button title="Limpiar filtros" variant="secondary" onPress={onClear} /> : null}
        <Button title="Listo" onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
