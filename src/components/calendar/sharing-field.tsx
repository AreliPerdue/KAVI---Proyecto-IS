import { Lock, Users } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip, Segmented, type SegmentedOption, SwitchRow } from '@/components/ui';
import { IconSize, IconStroke, Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useTheme } from '@/hooks/use-theme';

export type ShareWith = 'none' | 'all' | 'some';

const OPCIONES: readonly SegmentedOption<ShareWith>[] = [
  { value: 'none', label: 'Nadie' },
  { value: 'some', label: 'Algunos' },
  { value: 'all', label: 'Todos' },
];

/**
 * Privacidad e invitaciones de una actividad (RF-C14, RF-S18).
 *
 * Son dos cosas distintas y conviene no confundirlas:
 *
 * - **Invitar** añade a esas personas a la actividad: les llega una invitación y, si
 *   la aceptan, la ven en su calendario como propia.
 * - **Privada** cambia lo que ven quienes NO están invitados. Por omisión, lo que ve
 *   cada contacto depende del nivel que le diste a tu calendario; marcarla privada
 *   hace que nadie vea el título, tenga el nivel que tenga. Sigues apareciendo
 *   ocupada en ese hueco: se protege el contenido, no la disponibilidad.
 *
 * Las dos son excluyentes: invitar a una actividad privada sería contradecirse, y la
 * base lo rechaza además de la interfaz.
 */
export function SharingField({
  isPrivate,
  onPrivateChange,
  shareWith,
  onShareWithChange,
  contactIds,
  onContactIdsChange,
  error,
}: {
  isPrivate: boolean;
  onPrivateChange: (value: boolean) => void;
  shareWith: ShareWith;
  onShareWithChange: (value: ShareWith) => void;
  contactIds: string[];
  onContactIdsChange: (ids: string[]) => void;
  error?: string;
}) {
  const theme = useTheme();
  const contacts = useContacts();
  const aceptados = (contacts.data ?? []).filter((c) => c.kind === 'accepted');

  const alternar = (id: string) =>
    onContactIdsChange(contactIds.includes(id) ? contactIds.filter((x) => x !== id) : [...contactIds, id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Users size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          Compartir
        </AppText>
      </View>

      {isPrivate ? (
        <AppText variant="caption" color="textTertiary">
          Una actividad privada no se puede compartir.
        </AppText>
      ) : aceptados.length === 0 ? (
        <AppText variant="caption" color="textTertiary">
          Aún no tienes contactos con quien compartir.
        </AppText>
      ) : (
        <>
          <Segmented options={OPCIONES} value={shareWith} onChange={onShareWithChange} />
          {shareWith === 'some' ? (
            <View style={styles.chips}>
              {aceptados.map((c) => (
                <Chip
                  key={c.profile.id}
                  label={c.profile.display_name?.split(' ')[0] ?? c.profile.username}
                  selected={contactIds.includes(c.profile.id)}
                  onPress={() => alternar(c.profile.id)}
                />
              ))}
            </View>
          ) : null}
          {shareWith === 'all' ? (
            <AppText variant="caption" color="textTertiary">
              Se invitará a tus {aceptados.length} contactos.
            </AppText>
          ) : null}
          {error ? (
            <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
        </>
      )}

      <SwitchRow
        label="Privada"
        hint="Tus contactos verán el hueco como ocupado, nunca el título."
        value={isPrivate}
        onValueChange={(valor) => {
          onPrivateChange(valor);
          // Marcarla privada retira las invitaciones pendientes de enviar.
          if (valor) {
            onShareWithChange('none');
            onContactIdsChange([]);
          }
        }}
      />
      {isPrivate ? (
        <View style={styles.aviso}>
          <Lock size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
          <AppText variant="caption" color="textTertiary">
            Solo tú ves de qué se trata.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
