import { ChevronDown, Ellipsis, Pin, PinOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Sheet } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { CalendarView } from '@/lib/dates';
import { usePreferencesStore } from '@/store/preferences-store';

/** Orden canónico, de lo más corto a lo más largo. La agenda va al final por ser otra forma. */
const VISTAS: readonly CalendarView[] = ['day', 'threeDays', 'week', 'month', 'agenda'];

export type ViewSwitcherProps = {
  view: CalendarView;
  onChange: (view: CalendarView) => void;
  /** En pantallas angostas la pastilla no cabe y se reduce a un botón con menú. */
  compact: boolean;
};

/**
 * Selector de vistas: pastilla con las vistas fijadas y un menú con todas (RF-C16).
 *
 * Son cinco vistas y en una pastilla no caben sin volverse ilegibles, así que cada quien
 * elige cuáles quiere a un toque. Las demás siguen disponibles en el menú, donde además
 * se fijan y se quitan con el alfiler. El menú nunca desaparece: es lo que garantiza que
 * ninguna vista quede inalcanzable por cómo esté configurada la pastilla.
 */
export function ViewSwitcher({ view, onChange, compact }: ViewSwitcherProps) {
  const theme = useTheme();
  const tx = useT();
  const VIEW_OPTIONS = VISTAS.map((value) => ({ value, label: tx.calendar.views[value] }));
  const labelDeVista = (v: CalendarView) => tx.calendar.views[v];
  const [menuAbierto, setMenuAbierto] = useState(false);
  const pinnedViews = usePreferencesStore((s) => s.pinnedViews);
  const togglePinnedView = usePreferencesStore((s) => s.togglePinnedView);

  const fijadas = VIEW_OPTIONS.filter((o) => pinnedViews.includes(o.value));

  const elegir = (v: CalendarView) => {
    onChange(v);
    setMenuAbierto(false);
  };

  const menu = (
    <Sheet visible={menuAbierto} onClose={() => setMenuAbierto(false)} title={tx.calendar.viewSheetTitle}>
      {VIEW_OPTIONS.map((option) => {
        const activa = option.value === view;
        const fijada = pinnedViews.includes(option.value);
        // La última fijada no se puede quitar: dejaría la pastilla vacía.
        const puedeDesfijar = !fijada || pinnedViews.length > 1;
        return (
          <View key={option.value} style={styles.filaMenu}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={option.label}
              onPress={() => elegir(option.value)}
              style={({ pressed }) => [styles.filaTexto, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
              <View
                style={[styles.punto, { backgroundColor: activa ? theme.ink : theme.border }]}
              />
              <AppText variant="body" color={activa ? 'text' : 'textSecondary'}>
                {option.label}
              </AppText>
            </Pressable>
            {/*
              El alfiler va como hermano y no dentro de la fila: un Pressable anidado en
              otro genera un `<button>` dentro de un `<button>`, que en web es HTML
              inválido y saca al interno del recorrido con teclado.
            */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: fijada }}
              accessibilityLabel={
                fijada
                  ? puedeDesfijar
                    ? tx.calendar.unpinView(option.label)
                    : tx.calendar.onlyPinnedView(option.label)
                  : tx.calendar.pinView(option.label)
              }
              disabled={!puedeDesfijar}
              hitSlop={8}
              onPress={() => togglePinnedView(option.value)}
              style={({ pressed }) => [styles.alfiler, pressed ? styles.pressed : null]}>
              {fijada ? (
                <Pin
                  size={IconSize.inline}
                  strokeWidth={IconStroke}
                  color={puedeDesfijar ? theme.text : theme.textTertiary}
                />
              ) : (
                <PinOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
              )}
            </Pressable>
          </View>
        );
      })}
    </Sheet>
  );

  if (compact) {
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx.calendar.changeView(labelDeVista(view))}
          onPress={() => setMenuAbierto(true)}
          style={({ pressed }) => [
            styles.contenedor,
            styles.botonCompacto,
            { backgroundColor: theme.surfaceAlt },
            pressed ? styles.pressed : null,
          ]}>
          <AppText variant="label">{labelDeVista(view)}</AppText>
          <ChevronDown size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </Pressable>
        {menu}
      </>
    );
  }

  return (
    <>
      <View style={[styles.contenedor, { backgroundColor: theme.surfaceAlt }]} accessibilityRole="tablist">
        {fijadas.map((option) => {
          const selected = option.value === view;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segmento,
                selected ? { backgroundColor: theme.surface, boxShadow: '0 1px 2px rgba(22,23,26,0.08)' } : null,
                pressed ? styles.pressed : null,
              ]}>
              <AppText variant="label" color={selected ? 'text' : 'textSecondary'}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx.calendar.moreViews}
          onPress={() => setMenuAbierto(true)}
          style={({ pressed }) => [styles.segmento, styles.segmentoMas, pressed ? styles.pressed : null]}>
          <Ellipsis size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </Pressable>
      </View>
      {menu}
    </>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    gap: 2,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  botonCompacto: { gap: Spacing.xs, paddingHorizontal: Spacing.sm, minHeight: 40 },
  segmento: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    minHeight: 34,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentoMas: { paddingHorizontal: Spacing.sm },
  filaMenu: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filaTexto: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
  },
  punto: { width: 10, height: 10, borderRadius: 5 },
  alfiler: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
