import { useRouter } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { AppText, EmptyState, ErrorState, Fab, LoadingState, Screen, ThemeIcon } from '@/components/ui';
import { IconStroke, Radius, Spacing } from '@/constants/theme';
import { useLists } from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import type { KaviList } from '@/types/domain';

/** Dos columnas: es la rejilla de tarjetas de RF-L1, al estilo de Google Keep. */
const COLUMNAS = 2;

function subtitulo(lista: KaviList): string {
  if (lista.total_count === 0) return 'Sin elementos';
  if (lista.pending_count === 0) return `Todo listo · ${lista.total_count}`;
  return `${lista.pending_count} ${lista.pending_count === 1 ? 'pendiente' : 'pendientes'} de ${lista.total_count}`;
}

/** Parte en filas de `COLUMNAS` para poder poner encabezados de ancho completo. */
function enFilas(listas: readonly KaviList[]): KaviList[][] {
  const filas: KaviList[][] = [];
  for (let i = 0; i < listas.length; i += COLUMNAS) filas.push(listas.slice(i, i + COLUMNAS));
  return filas;
}

/**
 * Inicio de KAVI Lists (RF-L1, RF-L3).
 *
 * Los grupos se pintan como bloques separados y no como encabezados dentro de una sola
 * rejilla: en una lista de dos columnas, un encabezado ocupa una celda y queda al lado
 * de una tarjeta en vez de encima del grupo. `SectionList` tampoco resuelve esto porque
 * no admite varias columnas.
 */
export default function ListsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const lists = useLists();

  const abrir = useCallback((id: string) => router.push({ pathname: '/(app)/list/[id]', params: { id } }), [router]);

  const { fijadas, propias } = useMemo(() => {
    const todas = lists.data ?? [];
    return { fijadas: todas.filter((l) => l.is_pinned), propias: todas.filter((l) => !l.is_pinned) };
  }, [lists.data]);

  const tarjeta = (item: KaviList) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${subtitulo(item)}`}
      onPress={() => abrir(item.id)}
      style={({ pressed }) => [
        styles.tarjeta,
        { backgroundColor: tint(item.color, 0.16), borderColor: item.color },
        pressed ? styles.pressed : null,
      ]}>
      <ThemeIcon name={item.icon} color={item.color} size={20} />
      <AppText variant="bodyStrong" numberOfLines={2}>
        {item.name}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {subtitulo(item)}
      </AppText>
    </Pressable>
  );

  const grupo = (titulo: string, listas: KaviList[]) =>
    listas.length === 0 ? null : (
      <View style={styles.grupo}>
        {/* Sin listas fijadas no hace falta encabezar "Mis listas": no hay de qué distinguirlas. */}
        {titulo ? (
          <AppText variant="caption" color="textTertiary">
            {titulo}
          </AppText>
        ) : null}
        {enFilas(listas).map((fila) => (
          <View key={fila[0]!.id} style={styles.fila}>
            {fila.map(tarjeta)}
            {/* Rellena el hueco de la última fila impar para que la tarjeta no se estire. */}
            {fila.length < COLUMNAS ? <View style={styles.hueco} /> : null}
          </View>
        ))}
      </View>
    );

  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="title" accessibilityRole="header">
        Listas
      </AppText>

      {lists.isPending ? <LoadingState /> : null}
      {lists.isError ? <ErrorState message={lists.error.message} onRetry={() => lists.refetch()} /> : null}

      {lists.isSuccess ? (
        lists.data.length === 0 ? (
          <EmptyState
            icon={<CircleCheck size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
            title="Todavía no tienes listas"
            description="El súper, las películas pendientes, lo de la casa. Toca + para crear la primera."
          />
        ) : (
          <ScrollView contentContainerStyle={styles.cuerpo} showsVerticalScrollIndicator={false}>
            {grupo('Fijadas', fijadas)}
            {grupo(fijadas.length > 0 ? 'Mis listas' : '', propias)}
          </ScrollView>
        )
      ) : null}

      {/* El alta de listas llega con T199; el cascarón deja su lugar y su etiqueta. */}
      <Fab label="Nueva lista" onPress={() => undefined} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  cuerpo: { gap: Spacing.lg, paddingBottom: Spacing['3xl'] },
  grupo: { gap: Spacing.sm },
  fila: { flexDirection: 'row', gap: Spacing.sm },
  hueco: { flex: 1 },
  tarjeta: {
    flex: 1,
    gap: Spacing.xs,
    minHeight: 104,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.8 },
});
