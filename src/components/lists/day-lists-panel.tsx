import { ChevronRight, Repeat } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from '@/components/calendar/activity-style';
import { AppText, ThemeIcon } from '@/components/ui';
import { IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, isToday } from '@/lib/dates';
import type { KaviList } from '@/types/domain';
import { useT } from '@/i18n';

import { cuentaDelDia, DayItemsList, type DayItemsListProps } from './day-items-strip';

/** Ancho del panel. Lo justo para un nombre de lista de dos palabras sin cortarlo. */
export const DAY_LISTS_PANEL_WIDTH = 272;

export type DayListsPanelProps = DayItemsListProps & {
  day: Date;
  onOpenAll: () => void;
};

/**
 * Panel lateral de listas en la vista diaria de web (RF-L27).
 *
 * En una pantalla ancha la franja de arriba desperdicia lo que sobra: estira tres
 * pendientes a todo lo ancho y le roba alto a la rejilla, que es lo que más se lee. A la
 * izquierda, en cambio, el día de listas y el de horas se ven lado a lado, como Calendar
 * pone sus calendarios junto a la semana.
 *
 * Arriba va lo de **este día** —vencidos, rutinas y pendientes con fecha, los mismos
 * renglones de la franja— y abajo un acceso rápido a todas las listas, para no tener que
 * salir del calendario para apuntar algo en el súper.
 */
export function DayListsPanel({ day, onOpenAll, ...lista }: DayListsPanelProps) {
  const theme = useTheme();
  const tx = useT();
  const hayAlgo = cuentaDelDia(lista) > 0;

  return (
    <View style={[styles.panel, { borderColor: theme.border }]}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.seccion}>
          <AppText variant="label" color="textSecondary" style={styles.titulo}>
            {isToday(day) ? 'Hoy' : formatShortDate(day)}
          </AppText>
          {hayAlgo ? (
            <View style={styles.renglones}>
              <DayItemsList {...lista} roomy />
            </View>
          ) : (
            <AppText variant="caption" color="textTertiary" style={styles.vacio}>
              {tx.lists.nothingThisDay}
            </AppText>
          )}
        </View>

        <View style={styles.seccion}>
          <View style={styles.cabecera}>
            <AppText variant="label" color="textSecondary">
              {tx.lists.yourLists}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx.lists.seeAllA11y}
              hitSlop={8}
              onPress={onOpenAll}
              style={({ pressed }) => [styles.enlace, pressed ? styles.pressed : null]}>
              <AppText variant="caption" color="textSecondary">
                {tx.lists.seeAll}
              </AppText>
            </Pressable>
          </View>

          {lista.lists.length === 0 ? (
            <AppText variant="caption" color="textTertiary" style={styles.vacio}>
              {tx.lists.noListsYet}
            </AppText>
          ) : (
            lista.lists.map((l) => <Acceso key={l.id} lista={l} onPress={() => lista.onOpenList(l.id)} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Una lista en el acceso rápido: su icono, su nombre y cuánto le falta. */
function Acceso({ lista, onPress }: { lista: KaviList; onPress: () => void }) {
  const theme = useTheme();
  const tx = useT();
  const rutina = !!lista.recurrence_rule;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tx.lists.openListPending(lista.name, lista.pending_count)}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.acceso,
        hovered ? { backgroundColor: theme.surfaceAlt } : null,
        pressed ? { backgroundColor: tint(lista.color, 0.16) } : null,
      ]}>
      <ThemeIcon name={lista.icon} color={lista.color} size={16} />
      <AppText variant="label" numberOfLines={1} style={styles.nombre}>
        {lista.name}
      </AppText>
      {rutina ? <Repeat size={12} strokeWidth={IconStroke} color={theme.textTertiary} /> : null}
      {lista.pending_count > 0 ? (
        <AppText variant="caption" color="textTertiary" tabular>
          {lista.pending_count}
        </AppText>
      ) : null}
      <ChevronRight size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { width: DAY_LISTS_PANEL_WIDTH, borderRightWidth: StyleSheet.hairlineWidth },
  contenido: { gap: Spacing.xl, paddingRight: Spacing.md, paddingBottom: Spacing['2xl'] },
  seccion: { gap: Spacing.xs },
  titulo: { paddingHorizontal: Spacing.xs },
  renglones: { gap: 2 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  enlace: { minHeight: 28, justifyContent: 'center' },
  vacio: { paddingHorizontal: Spacing.xs },
  acceso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 40,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  nombre: { flex: 1 },
  pressed: { opacity: 0.75 },
});
