import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from './activity-style';

import { AppText, ColorDot } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts, useSelfColor } from '@/hooks/use-connections';
import { useModuleNav } from '@/hooks/use-modules';
import { useTheme } from '@/hooks/use-theme';
import { needsOutline } from '@/lib/color';

export type PeopleTabsProps = {
  /** Contactos superpuestos ahora mismo. Vacío = solo mi calendario. */
  overlayUserIds: string[];
  colorOf: (userId: string) => string;
  onToggle: (userId: string) => void;
  onOnlyMe: () => void;
};

function PersonTab({ label, selected, color, onPress }: { label: string; selected: boolean; color: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,
        // El color de la persona va en el punto y el borde, no de relleno: así la
        // etiqueta conserva el contraste del token de texto en ambos estados.
        selected
          ? { backgroundColor: tint(color, 0.22), borderColor: needsOutline(color, theme.background) ? theme.textTertiary : color }
          : { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' },
        pressed ? styles.pressed : null,
      ]}>
      <ColorDot hex={color} style={selected ? null : styles.apagado} />
      <AppText variant="label" color={selected ? 'text' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Pestañas "Tú · contactos · + Contactos" para superponer calendarios (RF-S7, RF-S8, RF-S15).
 * Se pueden activar varios contactos a la vez; "Tú" vuelve a dejar solo mi calendario.
 */
export function PeopleTabs({ overlayUserIds, colorOf, onToggle, onOnlyMe }: PeopleTabsProps) {
  const theme = useTheme();
  const { abrir: abrirModulo } = useModuleNav();
  const contacts = useContacts();
  const miColor = useSelfColor();
  const sharing = (contacts.data ?? []).filter((c) => c.kind === 'accepted' && c.theirCalendarVisibility);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      <PersonTab label="Tú" selected color={miColor} onPress={onOnlyMe} />
      {sharing.map((c) => (
        <PersonTab
          key={c.profile.id}
          label={c.profile.display_name?.split(' ')[0] ?? 'Contacto'}
          selected={overlayUserIds.includes(c.profile.id)}
          color={colorOf(c.profile.id)}
          onPress={() => onToggle(c.profile.id)}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar contactos"
        onPress={() => abrirModulo('shared')}
        style={({ pressed }) => [styles.tab, styles.addTab, { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }, pressed ? styles.pressed : null]}>
        <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          Contactos
        </AppText>
      </Pressable>
      <View style={{ width: Spacing.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  /*
   * Etiquetas en `label` (14) y no en `bodyStrong` (16), con menos relleno lateral.
   * La fila es un carrusel horizontal, así que nada quedaba fuera de alcance, pero a
   * 390 px "+ Contactos" se partía a media palabra y parecía un desbordamiento. Con
   * cuatro pastillas más angostas entran completas sin deslizar. El alto se queda en
   * 40 para no achicar el área táctil.
   */
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    minHeight: 40,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
  },
  apagado: { opacity: 0.55 },
  addTab: { gap: Spacing.xs, paddingLeft: Spacing.sm },
  pressed: { opacity: 0.75 },
});
