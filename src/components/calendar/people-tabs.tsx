import { Check, Ellipsis, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { tint } from './activity-style';

import { AppText, ColorDot, Sheet, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts, useSelfColor } from '@/hooks/use-connections';
import { useModuleNav } from '@/hooks/use-modules';
import { useTheme } from '@/hooks/use-theme';
import { needsOutline } from '@/lib/color';
import { buscarPersonas, personasEnBarra } from '@/lib/people-bar';
import { usePreferencesStore } from '@/store/preferences-store';

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
 *
 * Con muchos contactos (RF-S15b) la barra muestra los 20 más recientes y un "···" que abre la
 * lista completa con buscador.
 */
export function PeopleTabs({ overlayUserIds, colorOf, onToggle, onOnlyMe }: PeopleTabsProps) {
  const theme = useTheme();
  const { abrir: abrirModulo } = useModuleNav();
  const contacts = useContacts();
  const miColor = useSelfColor();
  const recientes = usePreferencesStore((s) => s.overlayRecientes);
  const [todas, setTodas] = useState(false);
  const [consulta, setConsulta] = useState('');

  const personas = useMemo(
    () =>
      (contacts.data ?? [])
        .filter((c) => c.kind === 'accepted' && c.theirCalendarVisibility)
        .map((c) => ({
          id: c.profile.id,
          nombre: c.profile.display_name ?? c.profile.username,
          usuario: c.profile.username,
          etiqueta: c.profile.display_name?.split(' ')[0] ?? 'Contacto',
        })),
    [contacts.data],
  );
  const { visibles, hayMas } = personasEnBarra(personas, recientes, overlayUserIds);
  const encontradas = buscarPersonas(personas, consulta);
  const cerrarTodas = () => {
    setTodas(false);
    setConsulta('');
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      <PersonTab label="Tú" selected color={miColor} onPress={onOnlyMe} />
      {visibles.map((p) => (
        <PersonTab
          key={p.id}
          label={p.etiqueta}
          selected={overlayUserIds.includes(p.id)}
          color={colorOf(p.id)}
          onPress={() => onToggle(p.id)}
        />
      ))}
      {hayMas ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Todas las personas"
          onPress={() => setTodas(true)}
          style={({ pressed }) => [styles.tab, styles.masTab, { backgroundColor: theme.surfaceAlt, borderColor: 'transparent' }, pressed ? styles.pressed : null]}>
          <Ellipsis size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        </Pressable>
      ) : null}
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

      <Sheet visible={todas} onClose={cerrarTodas} title="Todas las personas">
        <TextField
          label="Buscar"
          value={consulta}
          onChangeText={setConsulta}
          placeholder="Nombre o @usuario"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {encontradas.length === 0 ? (
          <AppText color="textSecondary">Nadie se llama así.</AppText>
        ) : (
          encontradas.map((p) => {
            const elegida = overlayUserIds.includes(p.id);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: elegida }}
                accessibilityLabel={`${p.nombre}, @${p.usuario}`}
                onPress={() => onToggle(p.id)}
                style={({ pressed }) => [styles.persona, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                <ColorDot hex={colorOf(p.id)} style={elegida ? null : styles.apagado} />
                <View style={styles.personaTexto}>
                  <AppText numberOfLines={1}>{p.nombre}</AppText>
                  <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                    @{p.usuario}
                  </AppText>
                </View>
                {elegida ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
              </Pressable>
            );
          })
        )}
      </Sheet>
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
  masTab: { paddingHorizontal: Spacing.md },
  persona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 52,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  personaTexto: { flex: 1 },
  pressed: { opacity: 0.75 },
});
