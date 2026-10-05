import { Check, Search, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ActionRow, AppText, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { equipmentName, exerciseName } from '@/lib/gym/display-names';
import { suggestVariants } from '@/lib/gym/variants';
import type { Exercise } from '@/types/domain';
import { useLanguage, useT } from '@/i18n';

export type VariantSheetProps = {
  visible: boolean;
  /** El ejercicio de la serie; sin él (nombre libre) solo se puede buscar en el catálogo. */
  base: Exercise | null;
  catalog: readonly Exercise[];
  /** La variante elegida ahora, si hay. */
  currentId: string | null;
  onClose: () => void;
  onPick: (exerciseId: string | null) => void;
  /** Cierra esta hoja y abre el selector completo. */
  onSearchAll: () => void;
};

/**
 * Elegir la variante de un drop mecánico (RF-F44): mismo peso, otra variante más fácil.
 * Sugiere las del mismo patrón y grupo muscular; para cualquier otra, el catálogo completo.
 */
export function VariantSheet({ visible, base, catalog, currentId, onClose, onPick, onSearchAll }: VariantSheetProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const v = tx.fitness.variant;
  const sugeridas = useMemo(() => (base ? suggestVariants(base, catalog) : []), [base, catalog]);
  const actual = currentId ? catalog.find((e) => e.id === currentId) ?? null : null;
  // Si la elegida no está entre las sugeridas (vino del catálogo completo), va primero.
  const lista = actual && !sugeridas.some((e) => e.id === actual.id) ? [actual, ...sugeridas] : sugeridas;
  const equipo = (e: Exercise) => e.equipment.map((q) => equipmentName(q, lang)).join(', ');

  return (
    <Sheet visible={visible} onClose={onClose} title={v.title}>
      <AppText variant="caption" color="textSecondary">
        {v.intro}
      </AppText>
      {lista.map((e) => {
        const elegida = e.id === currentId;
        return (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityState={{ selected: elegida }}
            accessibilityLabel={`${exerciseName(e, lang)}${elegida ? v.chosenSuffix : ''}`}
            onPress={() => {
              onPick(e.id);
              onClose();
            }}
            style={({ pressed }) => [
              styles.fila,
              { borderColor: elegida ? theme.ink : theme.border, backgroundColor: pressed || elegida ? theme.surfaceAlt : 'transparent' },
            ]}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{exerciseName(e, lang)}</AppText>
              {equipo(e) ? (
                <AppText variant="caption" color="textTertiary">
                  {equipo(e)}
                </AppText>
              ) : null}
            </View>
            {elegida ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} /> : null}
          </Pressable>
        );
      })}
      {base && lista.length === 0 ? <AppText color="textSecondary">{v.noneSuggested}</AppText> : null}
      <ActionRow
        icon={<Search size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
        label={v.searchAll}
        onPress={onSearchAll}
      />
      {currentId ? (
        <ActionRow
          icon={<X size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
          label={v.none}
          onPress={() => {
            onPick(null);
            onClose();
          }}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 56, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  flex: { flex: 1, gap: 2 },
});
