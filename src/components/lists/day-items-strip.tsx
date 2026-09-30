import { format, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronRight, Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { AppText, ThemeIcon } from '@/components/ui';
import { IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fromDayKey } from '@/lib/dates';
import type { KaviList, ListItem } from '@/types/domain';

/** Más allá de esto la franja deja de ser "una franja" y se come el día. */
const MAX_ALTO = 132;

/** "ayer" o "15 sep": lo reciente se nombra, lo lejano se fecha. */
function fechaVencida(dayKey: string): string {
  const fecha = fromDayKey(dayKey);
  return isYesterday(fecha) ? 'ayer' : format(fecha, 'd MMM', { locale: es });
}

export type DayItemsStripProps = {
  items: readonly ListItem[];
  /**
   * Pendientes de días anteriores que siguen sin palomear (RF-L18).
   *
   * Van arriba de los de hoy y no mezclados: lo que ya se te pasó es información distinta
   * de lo que toca hoy, y ordenarlo junto lo escondería entre lo demás.
   */
  overdue: readonly ListItem[];
  onReschedule: () => void;
  /** Listas activas, para saber el icono y el color de cada elemento. */
  lists: readonly KaviList[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleItem: (item: ListItem, done: boolean) => void;
  onOpenItem: (item: ListItem) => void;
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
export function DayItemsStrip({
  items,
  overdue,
  onReschedule,
  lists,
  collapsed,
  onToggleCollapsed,
  onToggleItem,
  onOpenItem,
}: DayItemsStripProps) {
  const theme = useTheme();
  if (items.length === 0 && overdue.length === 0) return null;

  const porId = new Map(lists.map((l) => [l.id, l]));
  const pendientes = items.filter((i) => i.completed_at === null).length + overdue.length;

  return (
    <View style={[styles.contenedor, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={`Listas, ${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}`}
        onPress={onToggleCollapsed}
        style={({ pressed }) => [styles.cabecera, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
        {collapsed ? (
          <ChevronRight size={16} strokeWidth={IconStroke} color={theme.textTertiary} />
        ) : (
          <ChevronDown size={16} strokeWidth={IconStroke} color={theme.textTertiary} />
        )}
        <AppText variant="caption" color="textSecondary">
          Listas
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {pendientes > 0 ? `${pendientes} sin hacer` : 'todo listo'}
        </AppText>
      </Pressable>

      {collapsed ? null : (
        <ScrollView style={styles.lista} contentContainerStyle={styles.listaContenido} showsVerticalScrollIndicator={false}>
          {overdue.length > 0 ? (
            <View style={styles.vencidosCabecera}>
              <AppText variant="caption" color="today">
                Vencidos
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reprogramar ${overdue.length} ${overdue.length === 1 ? 'pendiente' : 'pendientes'} para hoy`}
                hitSlop={8}
                onPress={onReschedule}
                style={({ pressed }) => [styles.reprogramar, pressed ? styles.pressed : null]}>
                <AppText variant="caption" color="today">
                  Reprogramar para hoy
                </AppText>
              </Pressable>
            </View>
          ) : null}

          {[...overdue, ...items].map((item) => {
            const vencido = item.due_date !== null && overdue.some((o) => o.id === item.id);
            const lista = porId.get(item.list_id);
            const color = lista?.color ?? theme.neutralActivity;
            const hecho = item.completed_at !== null;
            return (
              <View key={item.id} style={styles.fila}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hecho }}
                  accessibilityLabel={item.title}
                  onPress={() => onToggleItem(item, !hecho)}
                  style={({ pressed }) => [
                    styles.toque,
                    { backgroundColor: tint(color, hecho ? 0.06 : 0.16) },
                    pressed ? styles.pressed : null,
                  ]}>
                  <View
                    style={[
                      styles.casilla,
                      { borderColor: hecho ? color : theme.border, backgroundColor: hecho ? color : 'transparent' },
                    ]}>
                    {hecho ? <Check size={11} strokeWidth={3} color={theme.onInk} /> : null}
                  </View>
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
                      {fechaVencida(item.due_date)}
                    </AppText>
                  ) : null}
                </Pressable>
                {/* Hermano y no anidado, para no meter un `<button>` dentro de otro en web. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${lista?.name ?? 'la lista'}`}
                  hitSlop={8}
                  onPress={() => onOpenItem(item)}
                  style={({ pressed }) => [styles.abrir, pressed ? styles.pressed : null]}>
                  <ChevronRight size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
                </Pressable>
              </View>
            );
          })}
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
  abrir: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
