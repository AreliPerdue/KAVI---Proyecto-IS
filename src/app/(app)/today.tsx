import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarPlus, Check, CircleCheck, Inbox } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { ModalHeader } from '@/components/modal-header';
import {
  AppText,
  DatePickerSheet,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  Segmented,
  ThemeIcon,
} from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import {
  useListItemsByDate,
  useListMutations,
  useLists,
  useOverdueListItems,
  useUndatedListItems,
} from '@/hooks/use-lists';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, fromDayKey, toDayKey } from '@/lib/dates';
import { useSnackbar } from '@/providers';
import type { KaviList, ListItem } from '@/types/domain';

export type VistaHoy = 'hoy' | 'algun-dia';

const VISTAS = [
  { value: 'hoy' as const, label: 'Hoy' },
  { value: 'algun-dia' as const, label: 'Algún día' },
];

/**
 * Hoy y Algún día (RF-L24, RF-L25).
 *
 * Las dos preguntas que ninguna lista contesta sola, porque cruzan todas: **qué me toca** y
 * **qué dejé pendiente sin fecha**. Viven en una sola pantalla con un segmentado porque son
 * las dos mitades de lo mismo —lo agendado y lo no agendado— y se salta de una a otra todo
 * el tiempo: lo normal es vaciar Hoy y después bajar a Algún día a agendar lo siguiente.
 */
export default function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const { vista: vistaInicial } = useLocalSearchParams<{ vista?: string }>();
  const [vista, setVista] = useState<VistaHoy>(vistaInicial === 'algun-dia' ? 'algun-dia' : 'hoy');

  const hoy = toDayKey(new Date());
  const lists = useLists();
  const delDia = useListItemsByDate(hoy, hoy, vista === 'hoy');
  const atrasados = useOverdueListItems(hoy, vista === 'hoy');
  const sinFecha = useUndatedListItems(vista === 'algun-dia');
  const { toggleItem, reschedule, updateItem } = useListMutations();

  /** Elemento al que se le está poniendo día desde Algún día. */
  const [agendando, setAgendando] = useState<ListItem | null>(null);

  const porLista = useMemo(() => new Map((lists.data ?? []).map((l) => [l.id, l])), [lists.data]);

  /** Listas cuya fecha completa (RF-L23) ya llegó: la lista entera es lo que vence. */
  const listasDeHoy = useMemo(
    () => (lists.data ?? []).filter((l) => l.due_date !== null && l.due_date <= hoy),
    [lists.data, hoy],
  );

  /*
   * En Algún día se agrupa por lista y no se muestra plano: veinte renglones del súper
   * seguidos de tres de la casa se leen como un muro. Con el nombre de la lista encima, una
   * lista larga se reconoce y se salta de un vistazo. El orden de los grupos es el del
   * inicio, para que la bandeja se recorra en el mismo orden que las listas.
   */
  const grupos = useMemo(() => {
    const porId = new Map<string, ListItem[]>();
    for (const it of sinFecha.data ?? []) {
      const grupo = porId.get(it.list_id);
      if (grupo) grupo.push(it);
      else porId.set(it.list_id, [it]);
    }
    return (lists.data ?? [])
      .map((l) => ({ lista: l, items: porId.get(l.id) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [sinFecha.data, lists.data]);

  const abrirLista = (listId: string) => router.push({ pathname: '/(app)/list/[id]', params: { id: listId } });

  const reprogramarTodo = () => {
    const ids = (atrasados.data ?? []).map((i) => i.id);
    if (ids.length === 0) return;
    reschedule.mutate(
      { ids, dueDate: hoy },
      { onSuccess: () => showSnackbar({ message: `${ids.length} ${ids.length === 1 ? 'pendiente' : 'pendientes'} para hoy.` }) },
    );
  };

  const agendar = (item: ListItem, fecha: Date) => {
    updateItem.mutate(
      { id: item.id, patch: { due_date: toDayKey(fecha) } },
      { onSuccess: () => showSnackbar({ message: `"${item.title}" para el ${formatShortDate(fecha)}.` }) },
    );
    setAgendando(null);
  };

  /**
   * Una fila de pendiente.
   *
   * Misma regla que dentro de la lista y que en la franja del día: palomear es del círculo
   * y tocar el texto abre. Aquí el texto lleva a su lista, porque esta pantalla no es un
   * lugar donde vivan los pendientes —es una pregunta sobre ellos— y editarlos en su casa
   * evita dos sitios donde cambiar lo mismo.
   */
  const fila = (item: ListItem, opciones: { vencido?: boolean; conLista?: boolean } = {}) => {
    const lista = porLista.get(item.list_id);
    const color = lista?.color ?? theme.neutralActivity;
    const hecho = item.completed_at !== null;
    const detalle = [
      opciones.conLista === false ? null : lista?.name,
      opciones.vencido && item.due_date ? formatShortDate(fromDayKey(item.due_date)) : null,
    ].filter(Boolean);

    return (
      <View key={item.id} style={styles.fila}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hecho }}
          accessibilityLabel={hecho ? `Marcar ${item.title} como pendiente` : `Marcar ${item.title} como hecho`}
          hitSlop={8}
          onPress={() => toggleItem.mutate({ id: item.id, done: !hecho })}
          style={({ pressed }) => [styles.casillaToque, pressed ? styles.pressed : null]}>
          <View
            style={[
              styles.casilla,
              { borderColor: hecho ? color : theme.border, backgroundColor: hecho ? color : 'transparent' },
            ]}>
            {hecho ? <Check size={12} strokeWidth={3} color={theme.onInk} /> : null}
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir ${item.title} en ${lista?.name ?? 'su lista'}`}
          onPress={() => abrirLista(item.list_id)}
          style={({ pressed }) => [styles.cuerpo, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
          <AppText
            variant="body"
            color={hecho ? 'textTertiary' : 'text'}
            numberOfLines={2}
            style={hecho ? styles.tachado : null}>
            {item.title}
          </AppText>
          {detalle.length > 0 ? (
            <AppText variant="caption" color={opciones.vencido ? 'today' : 'textTertiary'} numberOfLines={1}>
              {detalle.join(' · ')}
            </AppText>
          ) : null}
        </Pressable>

        {/* En la bandeja, cada renglón trae a la mano lo único que se viene a hacer aquí. */}
        {vista === 'algun-dia' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ponerle día a ${item.title}`}
            hitSlop={8}
            onPress={() => setAgendando(item)}
            style={({ pressed }) => [styles.accion, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
            <CalendarPlus size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const filaLista = (lista: KaviList) => (
    <Pressable
      key={lista.id}
      accessibilityRole="button"
      accessibilityLabel={`Abrir la lista ${lista.name}`}
      onPress={() => abrirLista(lista.id)}
      style={({ pressed }) => [
        styles.filaLista,
        { backgroundColor: tint(lista.color, 0.14) },
        pressed ? styles.pressed : null,
      ]}>
      <ThemeIcon name={lista.icon} color={lista.color} size={18} />
      <AppText variant="body" numberOfLines={1} style={styles.nombreLista}>
        {lista.name}
      </AppText>
      <AppText variant="caption" color={lista.due_date !== null && lista.due_date < hoy ? 'today' : 'textTertiary'}>
        {lista.pending_count > 0 ? `${lista.pending_count} sin hacer` : 'todo listo'}
      </AppText>
    </Pressable>
  );

  const encabezado = (texto: string, accion?: { label: string; onPress: () => void }, alerta = false) => (
    <View style={styles.encabezado}>
      <AppText variant="caption" color={alerta ? 'today' : 'textTertiary'}>
        {texto}
      </AppText>
      {accion ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accion.label}
          hitSlop={8}
          onPress={accion.onPress}
          style={({ pressed }) => [styles.enlace, pressed ? styles.pressed : null]}>
          <AppText variant="caption" color={alerta ? 'today' : 'textSecondary'}>
            {accion.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );

  const consulta = vista === 'hoy' ? delDia : sinFecha;
  const vacioHoy =
    (delDia.data ?? []).length === 0 && (atrasados.data ?? []).length === 0 && listasDeHoy.length === 0;

  return (
    <Screen contentStyle={styles.content}>
      <ModalHeader back title={vista === 'hoy' ? 'Hoy' : 'Algún día'} />

      <Segmented options={VISTAS} value={vista} onChange={setVista} fullWidth />

      {consulta.isPending ? <LoadingState /> : null}
      {consulta.isError ? <ErrorState message={consulta.error.message} onRetry={() => consulta.refetch()} /> : null}

      {consulta.isSuccess ? (
        <ScrollView contentContainerStyle={styles.cuerpoScroll} showsVerticalScrollIndicator={false}>
          {vista === 'hoy' ? (
            vacioHoy ? (
              <EmptyState
                icon={<CircleCheck size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
                title="Nada para hoy"
                description="Lo que tenga fecha de hoy, y lo que se te haya pasado, aparece aquí."
              />
            ) : (
              <>
                {/*
                  Lo atrasado va arriba y separado, igual que en la franja del día: no es
                  "lo que toca hoy" sino "lo que ya se te pasó", y ordenarlo junto lo
                  escondería entre lo demás justo cuando lleva más tiempo esperando.
                */}
                {(atrasados.data ?? []).length > 0 ? (
                  <View style={styles.grupo}>
                    {encabezado(
                      'Atrasado',
                      { label: 'Pasar todo a hoy', onPress: reprogramarTodo },
                      true,
                    )}
                    {(atrasados.data ?? []).map((i) => fila(i, { vencido: true }))}
                  </View>
                ) : null}

                {(delDia.data ?? []).length > 0 ? (
                  <View style={styles.grupo}>
                    {encabezado('Hoy')}
                    {(delDia.data ?? []).map((i) => fila(i))}
                  </View>
                ) : null}

                {listasDeHoy.length > 0 ? (
                  <View style={styles.grupo}>
                    {encabezado('Listas que vencen')}
                    {listasDeHoy.map(filaLista)}
                  </View>
                ) : null}
              </>
            )
          ) : grupos.length === 0 ? (
            <EmptyState
              icon={<Inbox size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
              title="Nada sin fecha"
              description="Aquí caen los pendientes a los que todavía no les pones día."
            />
          ) : (
            grupos.map(({ lista, items }) => (
              <View key={lista.id} style={styles.grupo}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir la lista ${lista.name}`}
                  onPress={() => abrirLista(lista.id)}
                  style={({ pressed }) => [styles.encabezadoLista, pressed ? styles.pressed : null]}>
                  <ThemeIcon name={lista.icon} color={lista.color} size={16} />
                  <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                    {lista.name}
                  </AppText>
                </Pressable>
                {items.map((i) => fila(i, { conLista: false }))}
              </View>
            ))
          )}
        </ScrollView>
      ) : null}

      {agendando ? (
        <DatePickerSheet
          visible
          value={new Date()}
          title="¿Qué día?"
          onClose={() => setAgendando(null)}
          onSelect={(fecha) => agendar(agendando, fecha)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  cuerpoScroll: { gap: Spacing.lg, paddingBottom: Spacing['2xl'] },
  grupo: { gap: 2 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
    paddingHorizontal: Spacing.xs,
  },
  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 32,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  enlace: { minHeight: 28, justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center' },
  casillaToque: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  casilla: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
    minHeight: 48,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  accion: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  filaLista: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  nombreLista: { flex: 1 },
  tachado: { textDecorationLine: 'line-through' },
  pressed: { opacity: 0.75 },
});
