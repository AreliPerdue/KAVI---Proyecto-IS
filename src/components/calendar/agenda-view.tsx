import { useMemo } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, StyleSheet, View } from 'react-native';

import { activityColor, lowContrastOutline, tint } from './activity-style';
import { groupByDay } from './group-by-day';

import { AppText, ThemeIcon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange, fromDayKey, isToday, toDayKey } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type AgendaViewProps = {
  from: Date;
  to: Date;
  activities: readonly Activity[];
  onPressActivity: (activity: Activity) => void;
  isSharedActivity?: (activity: Activity) => boolean;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

type Dia = { key: string; date: Date; activities: Activity[] };

/**
 * Vista de agenda: lista cronológica continua, sin rejilla de horas.
 *
 * Es la respuesta a un problema real de la vista mensual: con pocas actividades, la
 * rejilla se ve casi vacía y hay que recorrerla con la vista para encontrar las tres
 * cosas que sí hay. Aquí solo se pintan los días que tienen algo, así que un mes flojo
 * cabe en una pantalla y se lee de corrido.
 */
export function AgendaView({ from, to, activities, onPressActivity, isSharedActivity, onScroll }: AgendaViewProps) {
  const theme = useTheme();

  const dias = useMemo<Dia[]>(() => {
    const byDay = groupByDay(activities);
    const salida: Dia[] = [];
    for (let d = new Date(from); d < to; d.setDate(d.getDate() + 1)) {
      const key = toDayKey(d);
      const delDia = byDay.get(key);
      // Los días vacíos se omiten: son justo el ruido que esta vista viene a quitar.
      if (delDia && delDia.length > 0) salida.push({ key, date: fromDayKey(key), activities: delDia });
    }
    return salida;
  }, [activities, from, to]);

  const renderDia = ({ item }: { item: Dia }) => {
    const hoy = isToday(item.date);
    return (
      <View style={styles.dia}>
        <View style={styles.fecha}>
          <AppText variant="caption" color={hoy ? 'text' : 'textTertiary'} tabular>
            {item.date.toLocaleDateString('es-MX', { weekday: 'short' }).slice(0, 3)}
          </AppText>
          <View style={[styles.numero, hoy ? { backgroundColor: theme.ink } : null]}>
            <AppText variant="bodyStrong" color={hoy ? 'onInk' : 'text'} tabular>
              {item.date.getDate()}
            </AppText>
          </View>
        </View>

        <View style={styles.filas}>
          {item.activities.map((a) => {
            const color = activityColor(a, theme);
            const compartida = isSharedActivity?.(a) ?? false;
            return (
              <Pressable
                key={a.id}
                accessibilityRole="button"
                accessibilityLabel={`${a.title}, ${formatTimeRange(a.start_at, a.end_at, a.all_day)}`}
                onPress={() => onPressActivity(a)}
                style={({ pressed }) => [
                  styles.fila,
                  { backgroundColor: tint(color, 0.16), borderLeftColor: color },
                  lowContrastOutline(color, theme),
                  compartida ? { borderWidth: 1, borderStyle: 'dashed', borderColor: color } : null,
                  pressed ? styles.pressed : null,
                ]}>
                <ThemeIcon name={a.icon} color={color} size={14} />
                <AppText variant="caption" numberOfLines={1} style={styles.titulo}>
                  {a.title}
                </AppText>
                <AppText variant="micro" color="textSecondary" tabular>
                  {formatTimeRange(a.start_at, a.end_at, a.all_day)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={dias}
      keyExtractor={(d) => d.key}
      renderItem={renderDia}
      contentContainerStyle={styles.lista}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={32}
      ItemSeparatorComponent={() => <View style={[styles.separador, { backgroundColor: theme.border }]} />}
    />
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: Spacing['3xl'] },
  dia: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md },
  fecha: { width: 40, alignItems: 'center', gap: 2 },
  numero: { minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filas: { flex: 1, gap: Spacing.xs },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 36,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderLeftWidth: 3,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  titulo: { flex: 1 },
  separador: { height: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.8 },
});
