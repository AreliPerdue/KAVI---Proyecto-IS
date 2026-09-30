import { useLocalSearchParams } from 'expo-router';
import { Check, FolderPlus, Pencil, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ItemComposer } from '@/components/lists/item-composer';
import { ModalHeader } from '@/components/modal-header';
import {
  ActionRow,
  AppText,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Sheet,
  TextField,
  ThemeIcon,
} from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useList, useListMutations } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import { useConfirm, useSnackbar } from '@/providers';
import type { ListItem, ListSection } from '@/types/domain';

/** Un renglón palomeable. La casilla y el texto son el mismo objetivo táctil. */
function Renglon({
  item,
  color,
  onToggle,
  onOpen,
}: {
  item: ListItem;
  color: string;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const hecho = item.completed_at !== null;
  return (
    <View style={styles.renglonContenedor}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hecho }}
        accessibilityLabel={item.title}
        onPress={() => onToggle(!hecho)}
        style={({ pressed }) => [styles.renglon, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        <View
          style={[
            styles.casilla,
            { borderColor: hecho ? color : theme.border, backgroundColor: hecho ? color : 'transparent' },
          ]}>
          {hecho ? <Check size={13} strokeWidth={3} color={theme.onInk} /> : null}
        </View>
        <View style={styles.texto}>
          <AppText
            variant="body"
            color={hecho ? 'textTertiary' : 'text'}
            numberOfLines={2}
            style={hecho ? styles.tachado : null}>
            {item.title}
          </AppText>
          {item.note ? (
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>
              {item.note}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {/*
        Hermano y no anidado: un Pressable dentro de otro genera un `<button>` dentro de
        un `<button>`, que en web es HTML inválido y saca al interno del foco por teclado.
      */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.title}`}
        hitSlop={8}
        onPress={onOpen}
        style={({ pressed }) => [styles.editar, pressed ? styles.pressed : null]}>
        <Pencil size={16} strokeWidth={IconStroke} color={theme.textTertiary} />
      </Pressable>
    </View>
  );
}

/** Detalle de una lista: secciones, captura, palomeo y completados (RF-L5 – RF-L10). */
export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const detalle = useList(id);
  const { toggleItem, addItem, updateItem, removeItem, addSection } = useListMutations();

  const [verCompletados, setVerCompletados] = useState(false);
  const [editando, setEditando] = useState<ListItem | null>(null);
  const [borrador, setBorrador] = useState({ title: '', note: '' });
  const [seccionNueva, setSeccionNueva] = useState(false);
  const [nombreSeccion, setNombreSeccion] = useState('');

  const datos = detalle.data;

  /**
   * Los pendientes se agrupan por sección; los completados bajan todos juntos al final
   * sin agrupar (RF-L6). Los que no tienen sección van primero, antes de la primera
   * cabecera: son los que se escribieron de corrido sin pensar dónde iban.
   */
  const { sueltos, porSeccion, completados } = useMemo(() => {
    const items = datos?.items ?? [];
    const pendientes = items.filter((i) => i.completed_at === null);
    const grupos = new Map<string, ListItem[]>();
    for (const s of datos?.sections ?? []) grupos.set(s.id, []);
    const libres: ListItem[] = [];
    for (const it of pendientes) {
      if (it.section_id && grupos.has(it.section_id)) grupos.get(it.section_id)!.push(it);
      else libres.push(it);
    }
    return { sueltos: libres, porSeccion: grupos, completados: items.filter((i) => i.completed_at !== null) };
  }, [datos]);

  const color = datos?.list.color ?? theme.ink;
  const alternar = (item: ListItem) => (done: boolean) => toggleItem.mutate({ id: item.id, done });

  const agregar = (sectionId: string | null) => (title: string) => {
    if (!id) return;
    addItem.mutate({ listId: id, input: { title, section_id: sectionId } });
  };

  const abrirEdicion = (item: ListItem) => {
    setEditando(item);
    setBorrador({ title: item.title, note: item.note ?? '' });
  };

  const guardarEdicion = () => {
    if (!editando) return;
    const title = borrador.title.trim();
    if (!title) return;
    updateItem.mutate(
      { id: editando.id, patch: { title, note: borrador.note.trim() || null } },
      { onSuccess: () => setEditando(null) },
    );
  };

  const eliminarItem = async () => {
    if (!editando) return;
    const item = editando;
    setEditando(null);
    const ok = await confirm({
      title: 'Eliminar elemento',
      // Palomear conserva; eliminar no. Conviene decir cuál es cuál antes de borrar.
      message: 'Si ya lo hiciste, paloméalo: se guarda en completados. Eliminar no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    removeItem.mutate(item.id, { onSuccess: () => showSnackbar({ message: 'Elemento eliminado.' }) });
  };

  const crearSeccion = () => {
    const nombre = nombreSeccion.trim();
    if (!id || !nombre) {
      setSeccionNueva(false);
      return;
    }
    addSection.mutate(
      { listId: id, name: nombre },
      {
        onSuccess: () => {
          setNombreSeccion('');
          setSeccionNueva(false);
        },
      },
    );
  };

  const mover = (item: ListItem, sectionId: string | null) => {
    updateItem.mutate({ id: item.id, patch: { section_id: sectionId } }, { onSuccess: () => setEditando(null) });
  };

  const chipSeccion = (activo: boolean, etiqueta: string, alTocar: () => void) => (
    <Pressable
      key={etiqueta}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={etiqueta}
      onPress={alTocar}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: activo ? color : theme.border, backgroundColor: activo ? theme.surfaceAlt : 'transparent' },
        pressed ? styles.pressed : null,
      ]}>
      <AppText variant="label" color="textSecondary">
        {etiqueta}
      </AppText>
    </Pressable>
  );

  return (
    <Screen contentStyle={styles.content}>
      {detalle.isPending ? <LoadingState /> : null}
      {detalle.isError ? <ErrorState message={detalle.error.message} onRetry={() => detalle.refetch()} /> : null}

      {datos ? (
        <>
          <ModalHeader back title={datos.list.name} right={<ThemeIcon name={datos.list.icon} color={color} size={24} />} />

          <ScrollView
            contentContainerStyle={styles.cuerpo}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {datos.items.length === 0 && datos.sections.length === 0 ? (
              <EmptyState
                icon={<ThemeIcon name={datos.list.icon} color={theme.textTertiary} size={32} />}
                title="Esta lista está vacía"
                description="Agrega lo primero que no quieras olvidar."
              />
            ) : null}

            {sueltos.map((it) => (
              <Renglon key={it.id} item={it} color={color} onToggle={alternar(it)} onOpen={() => abrirEdicion(it)} />
            ))}
            <ItemComposer label="Agregar elemento" accent={color} onSubmit={agregar(null)} />

            {(datos.sections as ListSection[]).map((s) => (
              <View key={s.id} style={styles.seccion}>
                <AppText variant="caption" color="textTertiary">
                  {s.name.toUpperCase()}
                </AppText>
                {(porSeccion.get(s.id) ?? []).map((it) => (
                  <Renglon key={it.id} item={it} color={color} onToggle={alternar(it)} onOpen={() => abrirEdicion(it)} />
                ))}
                <ItemComposer label={`Agregar en ${s.name}`} accent={color} onSubmit={agregar(s.id)} />
              </View>
            ))}

            {seccionNueva ? (
              <View style={styles.seccionNueva}>
                <TextField
                  label="Nombre de la sección"
                  value={nombreSeccion}
                  onChangeText={setNombreSeccion}
                  onSubmitEditing={crearSeccion}
                  placeholder="Ej. Frutas y verduras"
                  maxLength={40}
                  autoFocus
                  returnKeyType="done"
                />
                <Button title="Crear sección" onPress={crearSeccion} loading={addSection.isPending} />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Nueva sección"
                onPress={() => setSeccionNueva(true)}
                style={({ pressed }) => [styles.filaSeccion, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                <FolderPlus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
                <AppText variant="label" color="textTertiary">
                  Nueva sección
                </AppText>
              </Pressable>
            )}

            {completados.length > 0 ? (
              <View style={styles.seccion}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: verCompletados }}
                  accessibilityLabel={`Completados, ${completados.length}`}
                  onPress={() => setVerCompletados((v) => !v)}
                  style={({ pressed }) => [
                    styles.completadosBoton,
                    pressed ? { backgroundColor: theme.surfaceAlt } : null,
                  ]}>
                  <AppText variant="caption" color="textSecondary">
                    {verCompletados ? 'Ocultar' : 'Ver'} completados ({completados.length})
                  </AppText>
                </Pressable>
                {verCompletados
                  ? completados.map((it) => (
                      <Renglon
                        key={it.id}
                        item={it}
                        color={color}
                        onToggle={alternar(it)}
                        onOpen={() => abrirEdicion(it)}
                      />
                    ))
                  : null}
              </View>
            ) : null}
          </ScrollView>
        </>
      ) : null}

      <Sheet visible={editando !== null} onClose={() => setEditando(null)} title="Elemento">
        {editando ? (
          <View style={styles.hoja}>
            <TextField
              label="Título"
              value={borrador.title}
              onChangeText={(t) => setBorrador((b) => ({ ...b, title: t }))}
              maxLength={200}
            />
            <TextField
              label="Nota"
              value={borrador.note}
              onChangeText={(t) => setBorrador((b) => ({ ...b, note: t }))}
              placeholder="Opcional"
              maxLength={500}
              multiline
            />

            {datos && datos.sections.length > 0 ? (
              <View style={styles.mover}>
                <AppText variant="label" color="textSecondary">
                  Sección
                </AppText>
                <View style={styles.chips}>
                  {chipSeccion(editando.section_id === null, 'Sin sección', () => mover(editando, null))}
                  {datos.sections.map((s) =>
                    chipSeccion(editando.section_id === s.id, s.name, () => mover(editando, s.id)),
                  )}
                </View>
              </View>
            ) : null}

            <Button title="Guardar" onPress={guardarEdicion} loading={updateItem.isPending} />
            <ActionRow
              icon={<Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label="Eliminar elemento"
              color="danger"
              onPress={eliminarItem}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  cuerpo: { gap: 2, paddingBottom: Spacing['3xl'] },
  seccion: { gap: 2, marginTop: Spacing.md },
  seccionNueva: { gap: Spacing.sm, marginTop: Spacing.md },
  renglonContenedor: { flexDirection: 'row', alignItems: 'center' },
  renglon: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  casilla: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, gap: 1 },
  tachado: { textDecorationLine: 'line-through' },
  editar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  filaSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.md,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  completadosBoton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
  },
  hoja: { gap: Spacing.md, paddingBottom: Spacing.md },
  mover: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.full,
  },
  pressed: { opacity: 0.75 },
});
