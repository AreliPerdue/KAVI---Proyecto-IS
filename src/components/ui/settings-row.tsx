import { ChevronRight } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

import { IconSize, IconStroke, MinTouchTarget, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Ancho del tile del icono; los separadores se alinean con la etiqueta, no con el borde. */
const ICON_TILE = 32;
const LABEL_INSET = ICON_TILE + Spacing.md;

/**
 * Grupo de ajustes: título opcional y tarjeta con las filas separadas por hairlines.
 * Es el patrón de lista agrupada de los ajustes de iOS/Android, adaptado a los tokens.
 */
export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.group}>
      {title ? (
        <AppText variant="label" color="textSecondary" style={styles.groupTitle}>
          {title}
        </AppText>
      ) : null}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <AppText variant="caption" color="textTertiary" style={styles.groupFooter}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

export type SettingsRowProps = {
  icon: ReactNode;
  label: string;
  /** Segunda línea bajo la etiqueta. */
  hint?: string;
  /** Valor a la derecha (recuento, estado…). Se ignora si se pasa `right`. */
  value?: string;
  /** Control propio a la derecha (p. ej. un `Toggle`). Sustituye al valor y al chevron. */
  right?: ReactNode;
  onPress?: () => void;
  /** Acción destructiva: etiqueta e icono en `danger`. */
  destructive?: boolean;
  disabled?: boolean;
};

/** Fila de ajuste: icono, etiqueta, valor y chevron. Sin `onPress` es solo informativa. */
export function SettingsRow({ icon, label, hint, value, right, onPress, destructive = false, disabled = false }: SettingsRowProps) {
  const theme = useTheme();
  const labelColor: ThemeColor = destructive ? 'danger' : 'text';
  const interactive = !!onPress && !disabled;

  const content = (
    <>
      <View style={[styles.iconTile, { backgroundColor: theme.surfaceAlt }]}>{icon}</View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={labelColor} numberOfLines={1}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color="textTertiary" numberOfLines={2}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {right ?? (
        <>
          {value ? (
            <AppText variant="label" color="textSecondary" numberOfLines={1} style={styles.value}>
              {value}
            </AppText>
          ) : null}
          {interactive ? <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} /> : null}
        </>
      )}
    </>
  );

  if (!interactive) {
    return (
      <View style={[styles.row, disabled ? styles.disabled : null]} accessible accessibilityLabel={value ? `${label}, ${value}` : label}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  groupTitle: { paddingHorizontal: Spacing.xs },
  groupFooter: { paddingHorizontal: Spacing.xs },
  card: { borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: LABEL_INSET + Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: MinTouchTarget + 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  iconTile: { width: ICON_TILE, height: ICON_TILE, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: '45%', textAlign: 'right' },
  disabled: { opacity: 0.5 },
});
