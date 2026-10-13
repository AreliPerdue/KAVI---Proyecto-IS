import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { AppText, Button, ColorSwatch, Sheet, TextField, ThemeIcon } from '@/components/ui';
import { isThemeIconName, THEME_ICON_NAMES, type ThemeIconName } from '@/constants/icons';
import { IconSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { LIST_COLOR_OPTIONS } from '@/lib/schemas/list';
import type { LibraryShelf } from '@/types/domain';

export type DatosDeLibrero = { name: string; color: string; icon: ThemeIconName };

export type ShelfEditSheetProps = {
  /** `'nuevo'` para crear uno; un librero para editarlo; `null` cierra. */
  shelf: LibraryShelf | 'nuevo' | null;
  onClose: () => void;
  onSave: (datos: DatosDeLibrero) => void;
  onDelete?: (shelf: LibraryShelf) => void;
};

const ICONO_POR_OMISION: ThemeIconName = isThemeIconName('book-open') ? 'book-open' : THEME_ICON_NAMES[0];

/**
 * Crear o editar un librero (RF-BL5): nombre, color (los de los Nobi, como las listas) e icono.
 * Eliminarlo no borra sus libros (RF-BL6).
 */
export function ShelfEditSheet({ shelf, onClose, onSave, onDelete }: ShelfEditSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={shelf !== null} onClose={onClose} title={shelf === 'nuevo' ? tx.library.shelves.new : tx.library.shelves.editTitle}>
      {shelf !== null ? <Formulario key={shelf === 'nuevo' ? 'nuevo' : shelf.id} shelf={shelf} onClose={onClose} onSave={onSave} onDelete={onDelete} /> : null}
    </Sheet>
  );
}

function Formulario({ shelf, onClose, onSave, onDelete }: Omit<ShelfEditSheetProps, 'shelf'> & { shelf: LibraryShelf | 'nuevo' }) {
  const theme = useTheme();
  const tx = useT();
  const s = tx.library.shelves;
  const existente = shelf === 'nuevo' ? null : shelf;
  const [nombre, setNombre] = useState(existente?.name ?? '');
  const [color, setColor] = useState(existente?.color ?? LIST_COLOR_OPTIONS[0].hex);
  const [icono, setIcono] = useState<ThemeIconName>(existente?.icon && isThemeIconName(existente.icon) ? existente.icon : ICONO_POR_OMISION);
  const [error, setError] = useState<string | null>(null);

  const guardar = () => {
    if (!nombre.trim()) {
      setError(s.nameRequired);
      return;
    }
    onSave({ name: nombre.trim(), color, icon: icono });
    onClose();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cuerpo} keyboardShouldPersistTaps="handled">
      <TextField
        label={s.name}
        placeholder={s.namePlaceholder}
        value={nombre}
        onChangeText={(t) => {
          setNombre(t);
          setError(null);
        }}
        error={error ?? undefined}
        autoFocus={shelf === 'nuevo'}
        autoCapitalize="sentences"
        returnKeyType="done"
        onSubmitEditing={guardar}
      />
      <View style={styles.seccion}>
        <AppText variant="label" color="textSecondary">
          {tx.lists.colorLabel}
        </AppText>
        <View style={styles.rejilla}>
          {LIST_COLOR_OPTIONS.map((c) => (
            <ColorSwatch key={c.id} hex={c.hex} label={tx.lists.colorA11y((tx.colors[c.id] ?? c.label).toLowerCase())} selected={color === c.hex} onPress={() => setColor(c.hex)} />
          ))}
        </View>
      </View>
      <View style={styles.seccion}>
        <AppText variant="label" color="textSecondary">
          {tx.lists.iconLabel}
        </AppText>
        <View style={styles.rejilla}>
          {THEME_ICON_NAMES.map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={tx.lists.iconA11y(n)}
              accessibilityState={{ selected: icono === n }}
              onPress={() => setIcono(n)}
              style={({ pressed }) => [
                styles.iconoCelda,
                { borderColor: icono === n ? color : theme.border, backgroundColor: icono === n ? tint(color, 0.16) : 'transparent' },
                pressed ? styles.presionada : null,
              ]}>
              <ThemeIcon name={n} color={icono === n ? color : theme.textSecondary} size={IconSize.inline} />
            </Pressable>
          ))}
        </View>
      </View>
      <Button title={s.save} onPress={guardar} />
      {existente && onDelete ? (
        <Button
          title={s.delete}
          variant="danger"
          onPress={() => {
            onClose();
            onDelete(existente);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  seccion: { gap: Spacing.sm },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconoCelda: { width: 40, height: 40, borderWidth: 1, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  presionada: { opacity: 0.75 },
});
