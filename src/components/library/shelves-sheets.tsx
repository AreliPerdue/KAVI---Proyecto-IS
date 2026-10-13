import { Check, GripVertical, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { arrastreReciente } from '@/components/lists/drag-guard';
import { DraggableRows } from '@/components/lists/draggable-rows';
import { AppText, Sheet, ThemeIcon } from '@/components/ui';
import { isThemeIconName } from '@/constants/icons';
import { IconSize, IconStroke, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { LibraryShelf } from '@/types/domain';

/** El icono de un librero en su color, o un punto de color si no tiene icono. */
function Marca({ shelf }: { shelf: LibraryShelf }) {
  const theme = useTheme();
  const color = shelf.color ?? theme.textSecondary;
  if (shelf.icon && isThemeIconName(shelf.icon)) return <ThemeIcon name={shelf.icon} color={color} size={IconSize.inline} />;
  return <View style={[styles.punto, { backgroundColor: color }]} />;
}

export type ShelvesManageSheetProps = {
  visible: boolean;
  shelves: readonly LibraryShelf[];
  /** Cuántos libros tiene cada librero. */
  counts: ReadonlyMap<string, number>;
  onClose: () => void;
  onReorder: (ids: string[]) => void;
  onEdit: (shelf: LibraryShelf) => void;
};

/**
 * Administrar libreros (RF-BL7): se reordenan arrastrando —el orden es el de las pestañas— y tocar uno
 * lo abre para editarlo o eliminarlo.
 */
export function ShelvesManageSheet({ visible, shelves, counts, onClose, onReorder, onEdit }: ShelvesManageSheetProps) {
  const theme = useTheme();
  const s = useT().library.shelves;
  return (
    <Sheet visible={visible} onClose={onClose} title={s.manage}>
      <AppText variant="caption" color="textSecondary" style={styles.pista}>
        {s.manageHint}
      </AppText>
      <DraggableRows
        items={shelves}
        keyOf={(sh) => sh.id}
        onReorder={(from, to) => {
          const ids = shelves.map((sh) => sh.id);
          const [movido] = ids.splice(from, 1);
          ids.splice(to, 0, movido);
          onReorder(ids);
        }}
        renderItem={(sh) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${sh.name}, ${s.count(counts.get(sh.id) ?? 0)}`}
            onPress={() => {
              if (arrastreReciente()) return;
              onClose();
              onEdit(sh);
            }}
            style={({ pressed }) => [styles.fila, { borderColor: theme.border }, pressed ? styles.presionada : null]}>
            <GripVertical size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            <Marca shelf={sh} />
            <AppText variant="body" style={styles.flex} numberOfLines={1}>
              {sh.name}
            </AppText>
            <AppText variant="caption" color="textTertiary" tabular>
              {s.count(counts.get(sh.id) ?? 0)}
            </AppText>
          </Pressable>
        )}
      />
    </Sheet>
  );
}

export type AddToShelfSheetProps = {
  /** Los libros a agregar; `null` cierra. */
  itemIds: readonly string[] | null;
  shelves: readonly LibraryShelf[];
  /** En qué libreros está ya cada libro (para la palomita cuando es uno solo). */
  membership: ReadonlyMap<string, ReadonlySet<string>>;
  onClose: () => void;
  /** Tocar un librero: con un libro, lo pone o lo quita; con varios, los pone a todos. */
  onToggle: (shelf: LibraryShelf, agregar: boolean) => void;
  onNew: () => void;
};

/**
 * "Agregar a librero" (RF-BL6, RF-BL15, RF-BL16): para un libro, cada librero dice si ya está ahí y
 * tocarlo lo pone o lo quita —sin borrarlo de los demás—; para varios, tocar un librero los pone a
 * todos. También se puede crear uno nuevo.
 */
export function AddToShelfSheet({ itemIds, shelves, membership, onClose, onToggle, onNew }: AddToShelfSheetProps) {
  const theme = useTheme();
  const s = useT().library.shelves;
  const uno = itemIds?.length === 1 ? itemIds[0] : null;
  return (
    <Sheet visible={itemIds !== null} onClose={onClose} title={s.addToTitle(itemIds?.length ?? 1)}>
      {shelves.map((sh) => {
        const esta = uno ? (membership.get(uno)?.has(sh.id) ?? false) : false;
        return (
          <Pressable
            key={sh.id}
            accessibilityRole="button"
            accessibilityLabel={sh.name}
            accessibilityState={uno ? { selected: esta } : undefined}
            onPress={() => onToggle(sh, !esta)}
            style={({ pressed }) => [styles.fila, { borderColor: theme.border }, pressed ? styles.presionada : null]}>
            <Marca shelf={sh} />
            <AppText variant="body" style={styles.flex} numberOfLines={1}>
              {sh.name}
            </AppText>
            {esta ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={s.new}
        onPress={() => {
          onClose();
          onNew();
        }}
        style={({ pressed }) => [styles.fila, { borderColor: 'transparent' }, pressed ? styles.presionada : null]}>
        <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="body" color="textSecondary">
          {s.new}
        </AppText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pista: { marginBottom: Spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: Math.max(MinTouchTarget, 52),
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
  },
  flex: { flex: 1 },
  punto: { width: 12, height: 12, borderRadius: 6 },
  presionada: { opacity: 0.85 },
});
