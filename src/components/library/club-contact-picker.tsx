import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import type { Contact } from '@/types/domain';

/**
 * Elegir a quién invitar a un club (spec 13f, RF-BC2; T306): solo contactos aceptados, hasta `max` personas.
 * Los que ya están en el club no aparecen.
 */
export function ClubContactPicker({
  contactos,
  elegidos,
  max,
  onCambiar,
}: {
  contactos: readonly Contact[];
  elegidos: readonly string[];
  max: number;
  onCambiar: (ids: string[]) => void;
}) {
  const theme = useTheme();
  const c = useT().library.clubs;
  if (!contactos.length) {
    return (
      <AppText variant="body" color="textSecondary">
        {c.noContacts}
      </AppText>
    );
  }
  return (
    <View style={styles.lista}>
      <AppText variant="caption" color="textSecondary">
        {c.inviteHint(max - elegidos.length)}
      </AppText>
      {contactos.map((k) => {
        const id = k.profile.id;
        const si = elegidos.includes(id);
        const lleno = !si && elegidos.length >= max;
        return (
          <Pressable
            key={id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: si, disabled: lleno }}
            accessibilityLabel={k.profile.display_name ?? k.profile.username ?? c.someone}
            disabled={lleno}
            onPress={() => onCambiar(si ? elegidos.filter((x) => x !== id) : [...elegidos, id])}
            style={({ pressed }) => [styles.fila, { borderColor: si ? theme.ink : theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface, opacity: lleno ? 0.5 : 1 }]}>
            <Avatar profile={k.profile} size={36} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {k.profile.display_name ?? k.profile.username ?? c.someone}
              </AppText>
              {k.profile.username ? (
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {`@${k.profile.username}`}
                </AppText>
              ) : null}
            </View>
            <View style={[styles.casilla, { borderColor: si ? theme.ink : theme.border, backgroundColor: si ? theme.ink : 'transparent' }]}>
              {si ? <Check size={16} strokeWidth={3} color={theme.onInk} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: Spacing.xs },
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', padding: Spacing.sm, minHeight: 56 },
  casilla: { width: 24, height: 24, borderRadius: Radius.sm, borderCurve: 'continuous', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
