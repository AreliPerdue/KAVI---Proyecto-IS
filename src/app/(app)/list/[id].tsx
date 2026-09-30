import { useLocalSearchParams } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, EmptyState, ErrorState, LoadingState, Screen, ThemeIcon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useList, useListMutations } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import type { ListItem, ListSection } from '@/types/domain';

/** Un renglón palomeable. La casilla y el texto son el mismo objetivo táctil. */
function Renglon({ item, color, onToggle }: { item: ListItem; color: string; onToggle: (done: boolean) => void }) {
  const theme = useTheme();
  const hecho = item.completed_at !== null;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: hecho }}
      accessibilityLabel={item.title}
      onPress={() => onToggle(!hecho)}
      style={({ pressed }) => [styles.renglon, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      <View style={[styles.casilla, { borderColor: hecho ? color : theme.border, backgroundColor: hecho ? color : 'transparent' }]}>
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
  );
}

/** Detalle de una lista: secciones, pendientes y completados (RF-L5 – RF-L10). */
export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const detalle = useList(id);
  const { toggleItem } = useListMutations();
  const [verCompletados, setVerCompletados] = useState(false);

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
    return {
      sueltos: libres,
      porSeccion: grupos,
      completados: items.filter((i) => i.completed_at !== null),
    };
  }, [datos]);

  const color = datos?.list.color ?? theme.ink;
  const alternar = (item: ListItem) => (done: boolean) => toggleItem.mutate({ id: item.id, done });

  return (
    <Screen contentStyle={styles.content}>
      {detalle.isPending ? <LoadingState /> : null}
      {detalle.isError ? <ErrorState message={detalle.error.message} onRetry={() => detalle.refetch()} /> : null}

      {datos ? (
        <>
          <ModalHeader
            back
            title={datos.list.name}
            right={<ThemeIcon name={datos.list.icon} color={color} size={24} />}
          />

          <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
            {sueltos.map((it) => (
              <Renglon key={it.id} item={it} color={color} onToggle={alternar(it)} />
            ))}

            {(datos.sections as ListSection[]).map((s) => {
              const suyos = porSeccion.get(s.id) ?? [];
              if (suyos.length === 0) return null;
              return (
                <View key={s.id} style={styles.seccion}>
                  <AppText variant="caption" color="textTertiary">
                    {s.name.toUpperCase()}
                  </AppText>
                  {suyos.map((it) => (
                    <Renglon key={it.id} item={it} color={color} onToggle={alternar(it)} />
                  ))}
                </View>
              );
            })}

            {datos.items.length === 0 ? (
              <EmptyState
                icon={<ThemeIcon name={datos.list.icon} color={theme.textTertiary} size={32} />}
                title="Esta lista está vacía"
                description="Agrega lo primero que no quieras olvidar."
              />
            ) : null}

            {completados.length > 0 ? (
              <View style={styles.seccion}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: verCompletados }}
                  accessibilityLabel={`Completados, ${completados.length}`}
                  onPress={() => setVerCompletados((v) => !v)}
                  style={({ pressed }) => [styles.completadosBoton, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                  <AppText variant="caption" color="textSecondary">
                    {verCompletados ? 'Ocultar' : 'Ver'} completados ({completados.length})
                  </AppText>
                </Pressable>
                {verCompletados
                  ? completados.map((it) => <Renglon key={it.id} item={it} color={color} onToggle={alternar(it)} />)
                  : null}
              </View>
            ) : null}
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titulo: { flex: 1 },
  cuerpo: { gap: 2, paddingBottom: Spacing['3xl'] },
  seccion: { gap: 2, marginTop: Spacing.md },
  renglon: {
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
  completadosBoton: { alignSelf: 'flex-start', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs, borderRadius: Radius.sm },
  pressed: { opacity: 0.8 },
});
