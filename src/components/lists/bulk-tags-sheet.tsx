import { Check, Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Sheet, TextField } from '@/components/ui';
import { MAX_ETIQUETA } from '@/constants/list-tags';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useListMutations, useListTags } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import { useSnackbar } from '@/providers';
import type { KaviList, ListTag } from '@/types/domain';
import { useT } from '@/i18n';

export type BulkTagsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Las listas seleccionadas en el inicio. */
  lists: readonly KaviList[];
  /** Al terminar de etiquetar: el inicio sale del modo selección. */
  onDone: () => void;
};

type Estado = 'todas' | 'algunas' | 'ninguna';

/**
 * Etiquetar varias listas a la vez (RF-L28, T270): es el "folder" de la selección múltiple.
 *
 * Cada etiqueta dice si la tienen todas, algunas o ninguna. Tocarla se la pone a todas, salvo
 * que ya la tengan todas: entonces se la quita. Así un solo toque siempre deja a las
 * seleccionadas iguales entre sí, que es lo que se busca al agruparlas.
 */
export function BulkTagsSheet({ visible, onClose, lists, onDone }: BulkTagsSheetProps) {
  const tx = useT();
  return (
    <Sheet visible={visible} onClose={onClose} title={tx.lists.selection.tagTitle(lists.length)}>
      {visible ? <Contenido lists={lists} onClose={onClose} onDone={onDone} /> : null}
    </Sheet>
  );
}

function Contenido({ lists, onClose, onDone }: Omit<BulkTagsSheetProps, 'visible'>) {
  const theme = useTheme();
  const tx = useT();
  const s = tx.lists.selection;
  const showSnackbar = useSnackbar();
  const todas = useListTags();
  const { createTag, setTagMany } = useListMutations();
  const [nueva, setNueva] = useState('');
  const ids = useMemo(() => lists.map((l) => l.id), [lists]);
  // Las sugerencias que todavía no existen, igual que en la hoja de una sola lista.
  const sugerencias = useMemo(() => {
    const nombres = new Set((todas.data ?? []).map((t) => t.name.toLowerCase()));
    return tx.lists.suggestedTags.filter((n) => !nombres.has(n.toLowerCase()));
  }, [todas.data, tx]);

  const estadoDe = (tagId: string): Estado => {
    const con = lists.filter((l) => l.tag_ids.includes(tagId)).length;
    return con === 0 ? 'ninguna' : con === lists.length ? 'todas' : 'algunas';
  };

  const aplicar = (tag: Pick<ListTag, 'id' | 'name'>, puesta: boolean) => {
    setTagMany.mutate(
      { ids, tagId: tag.id, puesta },
      {
        onSuccess: () => showSnackbar({ message: puesta ? s.tagged(tag.name, ids.length) : s.untagged(tag.name, ids.length) }),
        onError: () => showSnackbar({ message: s.failed }),
      },
    );
    onClose();
    onDone();
  };

  const crearYPoner = (name: string) => {
    const limpio = name.trim();
    if (!limpio) return;
    setNueva('');
    createTag.mutate(limpio, { onSuccess: (tag) => aplicar(tag, true) });
  };

  return (
      <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <AppText variant="caption" color="textTertiary">
          {s.tagHint}
        </AppText>
        {(todas.data ?? []).map((t) => {
          const estado = estadoDe(t.id);
          return (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: estado === 'todas' ? true : estado === 'algunas' ? 'mixed' : false }}
              accessibilityLabel={s.tagState(t.name, estado)}
              onPress={() => aplicar(t, estado !== 'todas')}
              style={({ pressed }) => [styles.toque, estado === 'todas' ? { backgroundColor: theme.surfaceAlt } : null, pressed ? styles.pressed : null]}>
              <View
                style={[
                  styles.casilla,
                  estado === 'ninguna'
                    ? { borderColor: theme.border }
                    : { borderColor: theme.ink, backgroundColor: theme.ink },
                ]}>
                {estado === 'todas' ? <Check size={12} strokeWidth={3} color={theme.onInk} /> : null}
                {estado === 'algunas' ? <Minus size={12} strokeWidth={3} color={theme.onInk} /> : null}
              </View>
              <AppText variant="body" numberOfLines={1} style={styles.nombre}>
                {t.name}
              </AppText>
            </Pressable>
          );
        })}

        {sugerencias.length > 0 ? (
          <View style={styles.grupo}>
            <AppText variant="caption" color="textTertiary">
              {tx.lists.suggestions}
            </AppText>
            <View style={styles.chips}>
              {sugerencias.map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={tx.lists.createTagA11y(n)}
                  onPress={() => crearYPoner(n)}
                  style={({ pressed }) => [styles.chip, { borderColor: theme.border }, pressed ? styles.pressed : null]}>
                  <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                  <AppText variant="label" color="textSecondary">
                    {n}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.grupo}>
          <TextField
            label={tx.lists.newTag}
            value={nueva}
            onChangeText={setNueva}
            onSubmitEditing={() => crearYPoner(nueva)}
            placeholder={tx.lists.newTagPlaceholder}
            maxLength={MAX_ETIQUETA}
            returnKeyType="done"
          />
          <Button
            title={tx.lists.createAndApply}
            variant="secondary"
            icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
            disabled={!nueva.trim()}
            loading={createTag.isPending}
            onPress={() => crearYPoner(nueva)}
          />
        </View>
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.sm, paddingBottom: Spacing.md },
  grupo: { gap: Spacing.sm, marginTop: Spacing.md },
  toque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  casilla: { width: 20, height: 20, borderRadius: Radius.sm, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  nombre: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  pressed: { opacity: 0.75 },
});
