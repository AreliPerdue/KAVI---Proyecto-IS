import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { activityColor, lowContrastOutline, tint } from './activity-style';

import { AppText, ThemeIcon } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeRange } from '@/lib/dates';
import type { Activity } from '@/types/domain';

export type ActivityBlockProps = {
  activity: Activity;
  onPress: (activity: Activity) => void;
  /** Modo compacto para columnas estrechas (vista semanal en móvil). */
  compact?: boolean;
  /** Solo el título: en la vista diaria la hora ya la da la posición en el timeline. */
  titleOnly?: boolean;
  /** Estilo distintivo para actividades compartidas conmigo (RF-S5). */
  shared?: boolean;
};

/** Bloque de actividad con color de dimensión/tema (RF-C2, RF-C3). */
export const ActivityBlock = memo(function ActivityBlock({ activity, onPress, compact = false, titleOnly = false, shared = false }: ActivityBlockProps) {
  const theme = useTheme();
  const color = activityColor(activity, theme);
  const time = formatTimeRange(activity.start_at, activity.end_at, activity.all_day);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shared ? `${activity.title}, ${time}, compartida por ${activity.owner_name ?? 'un contacto'}` : `${activity.title}, ${time}`}
      onPress={() => onPress(activity)}
      style={({ pressed }) => [
        styles.block,
        { backgroundColor: tint(color, 0.16), borderLeftColor: color },
        lowContrastOutline(color, theme),
        shared ? { borderWidth: 1, borderStyle: 'dashed', borderColor: color } : null,
        pressed ? styles.pressed : null,
      ]}>
      <View style={styles.row}>
        {!compact ? <ThemeIcon name={activity.icon} color={color} size={12} /> : null}
        {/*
          Título en `caption` y no en `label`: a 14 px un bloque de media hora cabía
          apenas una línea y "Gimnasio · pierna" se cortaba a la mitad. Calendar y
          Google Calendar rondan los 11-12 px por lo mismo — en una rejilla de horas
          lo que escasea es el alto, y cada punto de tipografía son letras que se
          pierden. La jerarquía se sostiene con la hora un punto por debajo.
        */}
        <AppText variant="caption" numberOfLines={compact ? 2 : 1} style={styles.title}>
          {activity.title}
        </AppText>
      </View>
      {!compact && !titleOnly ? (
        <AppText variant="micro" color="textSecondary" tabular numberOfLines={1}>
          {shared && activity.owner_name ? `${time} · ${activity.owner_name}` : time}
        </AppText>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  block: {
    flex: 1,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    borderLeftWidth: 3,
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: 3,
    gap: 1,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  title: { flex: 1 },
  pressed: { opacity: 0.8 },
});
