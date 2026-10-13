import { FolderCog, Plus } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip, IconButton, ThemeIcon } from '@/components/ui';
import { IconSize, IconStroke, PAPER, Spacing } from '@/constants/theme';
import { isThemeIconName } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryShelf } from '@/types/domain';

export type ShelfTabsProps = {
  shelves: readonly LibraryShelf[];
  /** El librero elegido; `null` es "Todos". */
  value: string | null;
  onChange: (id: string | null) => void;
  onNew: () => void;
  onManage: () => void;
};

/**
 * Los libreros como pestañas arriba de la librería (RF-BL7): "Todos" y los propios, cada uno con su
 * color e icono, y al final crear uno y administrarlos. Quien no use libreros solo ve "Todos" y el +
 * (RF-BL5: organizar es opcional).
 */
export function ShelfTabs({ shelves, value, onChange, onNew, onManage }: ShelfTabsProps) {
  const theme = useTheme();
  const s = useT().library.shelves;
  return (
    <View style={styles.fila} accessibilityRole="tablist" accessibilityLabel={s.tabsLabel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.flex}>
        <Chip label={s.all} selected={value === null} onPress={() => onChange(null)} />
        {shelves.map((sh) => (
          <Chip
            key={sh.id}
            label={sh.name}
            selected={value === sh.id}
            color={sh.color ?? undefined}
            icon={
              sh.icon && isThemeIconName(sh.icon) ? (
                <ThemeIcon name={sh.icon} size={16} color={value === sh.id ? (sh.color ? PAPER : theme.onInk) : (sh.color ?? theme.textSecondary)} />
              ) : undefined
            }
            onPress={() => onChange(sh.id)}
          />
        ))}
        <IconButton label={s.new} onPress={onNew}>
          <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      </ScrollView>
      {shelves.length > 0 ? (
        <IconButton label={s.manage} onPress={onManage}>
          <FolderCog size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </IconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
  chips: { gap: Spacing.sm, alignItems: 'center', paddingRight: Spacing.sm },
});
