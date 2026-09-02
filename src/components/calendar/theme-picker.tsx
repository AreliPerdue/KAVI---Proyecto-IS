import { useRouter } from 'expo-router';
import { Check, Settings2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, LoadingState, Sheet, TextField, ThemeIcon } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemes, useThemesByDimension } from '@/hooks/use-themes';
import type { Theme } from '@/types/domain';

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Picker de temas agrupado por dimensión con búsqueda (RF-T1). */
export function ThemePicker({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string | null;
  onClose: () => void;
  onSelect: (theme: Theme | null) => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const themes = useThemes();
  const [query, setQuery] = useState('');
  const groups = useThemesByDimension(themes.data);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, themes: g.themes.filter((t) => normalize(t.name).includes(q) || normalize(g.dimension.label).includes(q)) }))
      .filter((g) => g.themes.length > 0);
  }, [groups, query]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Tema">
      <TextField label="Buscar" value={query} onChangeText={setQuery} placeholder="Gimnasio, lectura, familia…" autoCorrect={false} />

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        onPress={() => onSelect(null)}
        style={({ pressed }) => [styles.row, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        <View style={[styles.swatch, { backgroundColor: theme.neutralActivity }]} />
        <AppText style={styles.rowLabel}>Sin tema</AppText>
        {value === null ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
      </Pressable>

      {themes.isPending ? <LoadingState label="Cargando temas…" /> : null}

      {filtered.map(({ dimension, themes: list }) => (
        <View key={dimension.key} style={styles.group}>
          <View style={styles.groupHeader}>
            <View style={[styles.dimensionDot, { backgroundColor: dimension.color }]} />
            <AppText variant="label" color="textSecondary">
              {dimension.label}
            </AppText>
          </View>
          <View style={styles.grid}>
            {list.map((t) => {
              const selected = t.id === value;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={t.name}
                  accessibilityState={{ selected }}
                  onPress={() => onSelect(t)}
                  style={({ pressed }) => [
                    styles.tile,
                    { borderColor: selected ? t.color : theme.border, backgroundColor: selected ? `${t.color}22` : theme.surface },
                    pressed ? styles.pressed : null,
                  ]}>
                  <ThemeIcon name={t.icon} color={t.color} size={IconSize.action} />
                  <AppText variant="caption" numberOfLines={2} style={styles.tileLabel}>
                    {t.name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {themes.isSuccess && filtered.length === 0 ? (
        <AppText color="textSecondary" style={styles.empty}>
          No hay temas con ese nombre.
        </AppText>
      ) : null}

      <Button
        title="Gestionar mis temas"
        variant="secondary"
        icon={<Settings2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        onPress={() => {
          onClose();
          router.push('/(app)/themes');
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 48, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderCurve: 'continuous' },
  rowLabel: { flex: 1 },
  swatch: { width: 20, height: 20, borderRadius: 6 },
  group: { gap: Spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dimensionDot: { width: 8, height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tile: {
    width: 96,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  tileLabel: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
  empty: { textAlign: 'center', paddingVertical: Spacing.md },
});
