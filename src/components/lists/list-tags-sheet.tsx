import { Check, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, LoadingState, Sheet, TextField } from '@/components/ui';
import { MAX_ETIQUETA, SUGERENCIAS_ETIQUETA } from '@/constants/list-tags';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useListMutations, useListTags, useTagsOfList } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import { useConfirm } from '@/providers';

export type ListTagsSheetProps = {
  visible: boolean;
  onClose: () => void;
  listId: string;
};

/**
 * Etiquetas de una lista (RF-L22).
 *
 * Las sugerencias —Casa, Escuela, Trabajo…— son solo eso: al tocar una se crea una etiqueta
 * **tuya** con ese nombre. No hay etiquetas del sistema, así que cualquiera se puede
 * renombrar o borrar sin pedir permiso.
 *
 * Etiquetar es cosa de quien mira: en una lista compartida, que tú la guardes en "Casa" no
 * le cambia nada a la otra persona. Por eso las etiquetas son propias y no de la lista.
 */
export function ListTagsSheet({ visible, onClose, listId }: ListTagsSheetProps) {
  const theme = useTheme();
  const confirm = useConfirm();
  const [nueva, setNueva] = useState('');
  const todas = useListTags();
  const puestas = useTagsOfList(visible ? listId : undefined);
  const { createTag, removeTag, setTag } = useListMutations();

  const puestasIds = useMemo(() => new Set((puestas.data ?? []).map((t) => t.id)), [puestas.data]);

  // Solo se sugiere lo que no existe ya: repetirlo sería ofrecer crear algo que ya está.
  const sugerencias = useMemo(() => {
    const nombres = new Set((todas.data ?? []).map((t) => t.name.toLowerCase()));
    return SUGERENCIAS_ETIQUETA.filter((s) => !nombres.has(s.toLowerCase()));
  }, [todas.data]);

  const crearYPoner = (name: string) => {
    setNueva('');
    createTag.mutate(name, {
      onSuccess: (tag) => setTag.mutate({ listId, tagId: tag.id, puesta: true }),
    });
  };

  const borrar = async (id: string, name: string) => {
    const ok = await confirm({
      title: `Eliminar "${name}"`,
      // Lo que se pierde es la forma de agrupar, no lo agrupado. Conviene decirlo.
      message: 'Se quitará de todas tus listas. Ninguna lista se elimina.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (ok) removeTag.mutate(id);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Etiquetas">
      {todas.isPending || puestas.isPending ? <LoadingState /> : null}

      <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {(todas.data ?? []).length > 0 ? (
          <View style={styles.grupo}>
            <AppText variant="caption" color="textTertiary">
              Tus etiquetas
            </AppText>
            {(todas.data ?? []).map((t) => {
              const activa = puestasIds.has(t.id);
              return (
                <View key={t.id} style={styles.fila}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: activa }}
                    accessibilityLabel={t.name}
                    onPress={() => setTag.mutate({ listId, tagId: t.id, puesta: !activa })}
                    style={({ pressed }) => [
                      styles.toque,
                      activa ? { backgroundColor: theme.surfaceAlt } : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <View
                      style={[
                        styles.casilla,
                        { borderColor: activa ? theme.ink : theme.border, backgroundColor: activa ? theme.ink : 'transparent' },
                      ]}>
                      {activa ? <Check size={12} strokeWidth={3} color={theme.onInk} /> : null}
                    </View>
                    <AppText variant="body" numberOfLines={1} style={styles.nombre}>
                      {t.name}
                    </AppText>
                    <AppText variant="caption" color="textTertiary" tabular>
                      {t.list_count}
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar la etiqueta ${t.name}`}
                    hitSlop={8}
                    onPress={() => borrar(t.id, t.name)}
                    style={({ pressed }) => [styles.borrar, pressed ? styles.pressed : null]}>
                    <Trash2 size={16} strokeWidth={IconStroke} color={theme.textTertiary} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {sugerencias.length > 0 ? (
          <View style={styles.grupo}>
            <AppText variant="caption" color="textTertiary">
              Sugerencias
            </AppText>
            <View style={styles.chips}>
              {sugerencias.map((s) => (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityLabel={`Crear la etiqueta ${s}`}
                  onPress={() => crearYPoner(s)}
                  style={({ pressed }) => [styles.chip, { borderColor: theme.border }, pressed ? styles.pressed : null]}>
                  <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                  <AppText variant="label" color="textSecondary">
                    {s}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.grupo}>
          <TextField
            label="Nueva etiqueta"
            value={nueva}
            onChangeText={setNueva}
            onSubmitEditing={() => nueva.trim() && crearYPoner(nueva)}
            placeholder="Ej. Universidad, Mascotas…"
            maxLength={MAX_ETIQUETA}
            returnKeyType="done"
          />
          <Button
            title="Crear y poner"
            variant="secondary"
            disabled={!nueva.trim()}
            loading={createTag.isPending}
            onPress={() => crearYPoner(nueva)}
          />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing.md },
  grupo: { gap: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center' },
  toque: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  casilla: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: { flex: 1 },
  borrar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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
