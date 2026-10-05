import { isYesterday } from 'date-fns';
import { ChevronDown, ChevronRight, Check, Repeat } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { AppText, ThemeIcon } from '@/components/ui';
import { IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fromDayKey, formatDayMonthShort } from '@/lib/dates';
import type { RutinaDelDia } from '@/lib/list-runs';
import type { KaviList, ListItem } from '@/types/domain';
import { t, type Language, useLanguage, useT } from '@/i18n';

/** Más allá de esto la franja deja de ser "una franja" y se come el día. */
const MAX_ALTO = 132;

/** "ayer" o "15 sep" / "yesterday" o "Sep 15": lo reciente se nombra, lo lejano se fecha. */
function fechaVencida(dayKey: string, lang: Language): string {
  const fecha = fromDayKey(dayKey);
  return isYesterday(fecha) ? t(lang).dates.yesterday : formatDayMonthShort(fecha, lang);
}

export type DayItemsListProps = {
  items: readonly ListItem[];
  /**
   * Pendientes de días anteriores que siguen sin palomear (RF-L18).
   *
   * Van arriba de los de hoy y no mezclados: lo que ya se te pasó es información distinta
   * de lo que toca hoy, y ordenarlo junto lo escondería entre lo demás.
   */
  overdue: readonly ListItem[];
  /** Rutinas a las que les toca este día, con lo que llevan hecho (RF-L26). */
  routines: readonly RutinaDelDia[];
  onReschedule: () => void;
  /** Listas activas, para saber el icono y el color de cada elemento. */
  lists: readonly KaviList[];
  onToggleItem: (item: ListItem, done: boolean) => void;
  onOpenItem: (item: ListItem) => void;
  onOpenList: (listId: string) => void;
  /** Renglones más altos y con más aire, para el panel lateral de web. */
  roomy?: boolean;
};

/** Cuántos renglones hay que mostrar; sin ninguno, ni la franja ni el panel dibujan nada. */
export function cuentaDelDia({ items, overdue, routines }: Pick<DayItemsListProps, 'items' | 'overdue' | 'routines'>) {
  return items.length + overdue.length + routines.length;
}

/**
 * Los renglones del día: vencidos, rutinas y pendientes con fecha.
 *
 * Es la misma pieza en la franja de arriba de la rejilla (teléfono y ventanas angostas) y
 * en el panel lateral de web. Que sea una sola evita que las dos vistas del mismo día
 * empiecen a decir cosas distintas.
 */
export function DayItemsList({
  items,
  overdue,
  routines,
  onReschedule,
  lists,
  onToggleItem,
  onOpenItem,
  onOpenList,
  roomy = false,
}: DayItemsListProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const porId = new Map(lists.map((l) => [l.id, l]));
  const alto = roomy ? styles.altoAmplio : null;

  return (
    <>
      {overdue.length > 0 ? (
        <View style={styles.vencidosCabecera}>
          <AppText variant="caption" color="today">
            {tx.lists.overdue}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx.lists.rescheduleA11y(overdue.length)}
            hitSlop={8}
            onPress={onReschedule}
            style={({ pressed }) => [styles.reprogramar, pressed ? styles.pressed : null]}>
            <AppText variant="caption" color="today">
              {tx.lists.rescheduleToday}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {overdue.map((item) => fila(item, true))}

      {/*
        Las rutinas van como **una** fila cada una, no un renglón por elemento: una rutina
        de ocho pasos se comería la franja, y sus elementos no tienen día propio —el día es
        de la vuelta—. El círculo dice si ya está completa; tocar la fila abre la lista en
        la vuelta de hoy, que es donde se palomea paso por paso.
      */}
      {routines.map((r) => {
        const color = r.list.color;
        return (
          <View key={`${r.list.id}@${r.day}`} style={styles.fila}>
            <View style={[styles.casillaToque, alto]}>
              <View
                style={[
                  styles.casilla,
                  { borderColor: r.completa ? color : theme.border, backgroundColor: r.completa ? color : 'transparent' },
                ]}>
                {r.completa ? <Check size={11} strokeWidth={3} color={theme.onInk} /> : null}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx.lists.openRoutine(r.list.name, r.hechos, r.total)}
              onPress={() => onOpenList(r.list.id)}
              style={({ pressed }) => [
                styles.toque,
                alto,
                { backgroundColor: tint(color, r.completa ? 0.06 : 0.16) },
                pressed ? styles.pressed : null,
              ]}>
              <ThemeIcon name={r.list.icon} color={color} size={14} />
              <AppText
                variant="caption"
                color={r.completa ? 'textTertiary' : 'text'}
                numberOfLines={1}
                style={[styles.titulo, r.completa ? styles.tachado : null]}>
                {r.list.name}
              </AppText>
              <Repeat size={12} strokeWidth={IconStroke} color={theme.textTertiary} />
              {r.total > 0 ? (
                <AppText variant="micro" color="textSecondary" tabular>
                  {r.hechos}/{r.total}
                </AppText>
              ) : null}
              <ChevronRight size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
            </Pressable>
          </View>
        );
      })}

      {items.map((item) => fila(item, false))}
    </>
  );

  function fila(item: ListItem, vencido: boolean) {
    const lista = porId.get(item.list_id);
    const color = lista?.color ?? theme.neutralActivity;
    const hecho = item.completed_at !== null;
    return (
      <View key={item.id} style={styles.fila}>
        {/*
          Misma regla que dentro de la lista: palomear es del círculo y tocar el texto
          abre. Aquí importa todavía más, porque la franja vive pegada a la rejilla del
          calendario y se toca de pasada.
        */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hecho }}
          accessibilityLabel={hecho ? tx.lists.markPending(item.title) : tx.lists.markDone(item.title)}
          hitSlop={8}
          onPress={() => onToggleItem(item, !hecho)}
          style={({ pressed }) => [styles.casillaToque, alto, pressed ? styles.pressed : null]}>
          <View
            style={[
              styles.casilla,
              { borderColor: hecho ? color : theme.border, backgroundColor: hecho ? color : 'transparent' },
            ]}>
            {hecho ? <Check size={11} strokeWidth={3} color={theme.onInk} /> : null}
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx.lists.openInList(lista?.name ?? null, item.title)}
          onPress={() => onOpenItem(item)}
          style={({ pressed }) => [
            styles.toque,
            alto,
            { backgroundColor: tint(color, hecho ? 0.06 : 0.16) },
            pressed ? styles.pressed : null,
          ]}>
          {lista ? <ThemeIcon name={lista.icon} color={color} size={14} /> : null}
          <AppText
            variant="caption"
            color={hecho ? 'textTertiary' : 'text'}
            numberOfLines={1}
            style={[styles.titulo, hecho ? styles.tachado : null]}>
            {item.title}
          </AppText>
          {vencido && item.due_date ? (
            <AppText variant="micro" color="today" tabular>
              {fechaVencida(item.due_date, lang)}
            </AppText>
          ) : null}
          <ChevronRight size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
        </Pressable>
      </View>
    );
  }
}

export type DayItemsStripProps = DayItemsListProps & {
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

/**
 * Pendientes del día, **arriba** de la rejilla de horas (RF-L12).
 *
 * Es el punto donde Lists y el calendario se vuelven un solo sistema sin mentir sobre lo
 * que el dato es. Un pendiente no ocupa un rato: ocupa un día. Colocarlo dentro de la
 * rejilla —aunque tenga hora— lo haría leerse como una cita, y "arreglar la puerta el
 * sábado" no significa "el sábado a las 10".
 *
 * Sin pendientes no se dibuja nada: una franja vacía le robaría alto a la rejilla todos
 * los días para no decir nada.
 */
export function DayItemsStrip({ collapsed, onToggleCollapsed, ...lista }: DayItemsStripProps) {
  const theme = useTheme();
  const tx = useT();
  if (cuentaDelDia(lista) === 0) return null;

  const pendientes =
    lista.items.filter((i) => i.completed_at === null).length +
    lista.overdue.length +
    lista.routines.filter((r) => !r.completa).length;

  return (
    <View style={[styles.contenedor, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={tx.lists.stripA11y(pendientes)}
        onPress={onToggleCollapsed}
        style={({ pressed }) => [styles.cabecera, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        {collapsed ? (
          <ChevronRight size={16} strokeWidth={IconStroke} color={theme.textTertiary} />
        ) : (
          <ChevronDown size={16} strokeWidth={IconStroke} color={theme.textTertiary} />
        )}
        <AppText variant="caption" color="textSecondary">
          {tx.lists.title}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {pendientes > 0 ? tx.lists.notDone(pendientes) : tx.lists.allDone}
        </AppText>
      </Pressable>

      {collapsed ? null : (
        <ScrollView style={styles.lista} contentContainerStyle={styles.listaContenido} showsVerticalScrollIndicator={false}>
          <DayItemsList {...lista} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: Spacing.xs, gap: 2 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 32,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  vencidosCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingTop: 2,
  },
  reprogramar: { minHeight: 28, justifyContent: 'center' },
  lista: { maxHeight: MAX_ALTO },
  listaContenido: { gap: 2 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  casillaToque: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  altoAmplio: { minHeight: 40, height: undefined },
  toque: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  casilla: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1 },
  tachado: { textDecorationLine: 'line-through' },
  pressed: { opacity: 0.8 },
});
