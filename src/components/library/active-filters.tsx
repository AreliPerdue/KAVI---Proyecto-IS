import { X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { LIBRARY_FILTER_COLORS } from '@/constants/library';
import { IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLanguage, useT } from '@/i18n';
import { formatShortDate } from '@/lib/dates';
import { type FiltrosBiblioteca, SIN_FILTROS } from '@/lib/library/filters';

const deIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Los filtros activos como chips que se quitan con su ✕ (RF-BL10), igual que en el calendario. Si hay
 * más de uno, al final "Quitar todo".
 */
export function ActiveFilters({
  filtros,
  onChange,
  nombresDeSagas,
}: {
  filtros: FiltrosBiblioteca;
  onChange: (f: FiltrosBiblioteca) => void;
  nombresDeSagas?: ReadonlyMap<string, string>;
}) {
  const theme = useTheme();
  const lang = useLanguage();
  const f = useT().library.find;
  const chips: { clave: string; etiqueta: string; color?: string; quitar: () => void }[] = [];
  const { fecha } = filtros;
  if (fecha) {
    const etiqueta =
      fecha === 'week' ? f.dateWeek : fecha === 'month' ? f.dateMonth : fecha === 'year' ? f.dateYear : f.dateChip(formatShortDate(deIso(fecha.desde), lang), formatShortDate(deIso(fecha.hasta), lang));
    chips.push({ clave: 'fecha', etiqueta, quitar: () => onChange({ ...filtros, fecha: null }) });
  }
  for (const id of filtros.sagas) {
    const nombre = nombresDeSagas?.get(id);
    if (nombre) chips.push({ clave: `s-${id}`, etiqueta: nombre, quitar: () => onChange({ ...filtros, sagas: filtros.sagas.filter((x) => x !== id) }) });
  }
  for (const g of filtros.generos) chips.push({ clave: `g-${g}`, etiqueta: g, quitar: () => onChange({ ...filtros, generos: filtros.generos.filter((x) => x !== g) }) });
  for (const a of filtros.autores) chips.push({ clave: `a-${a}`, etiqueta: a, quitar: () => onChange({ ...filtros, autores: filtros.autores.filter((x) => x !== a) }) });
  if (filtros.color) {
    const nombre = LIBRARY_FILTER_COLORS.find((c) => c.hex === filtros.color)?.id;
    chips.push({ clave: 'color', etiqueta: (nombre && f.colorNames[nombre]) || f.colorChip, color: filtros.color, quitar: () => onChange({ ...filtros, color: null }) });
  }
  if (chips.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
      {chips.map((c) => (
        <Pressable
          key={c.clave}
          accessibilityRole="button"
          accessibilityLabel={f.removeFilter(c.etiqueta)}
          onPress={c.quitar}
          hitSlop={{ top: 6, bottom: 6 }}
          style={({ pressed }) => [styles.chip, { borderColor: theme.today, backgroundColor: theme.surface }, pressed ? styles.presionada : null]}>
          {c.color ? <View style={[styles.muestra, { backgroundColor: c.color, borderColor: theme.border }]} /> : null}
          <AppText variant="label">{c.etiqueta}</AppText>
          <X size={14} strokeWidth={IconStroke} color={theme.textSecondary} />
        </Pressable>
      ))}
      {chips.length > 1 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={f.clearAll} onPress={() => onChange(SIN_FILTROS)} hitSlop={8} style={styles.quitarTodo}>
          <AppText variant="label" color="textSecondary">
            {f.clearAll}
          </AppText>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fila: { gap: Spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 32,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  muestra: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth },
  quitarTodo: { paddingHorizontal: Spacing.sm, minHeight: 32, justifyContent: 'center' },
  presionada: { opacity: 0.85 },
});
