import { Check, Eye, EyeOff, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Segmented } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityVisibility } from '@/types/domain';
import { useT } from '@/i18n';

const OPCIONES: readonly ActivityVisibility[] = ['default', 'selected', 'private'];

/**
 * Quién ve el título de esta actividad (RF-C14).
 *
 * Es distinto de invitar. Invitar añade a alguien a la actividad y le llega una
 * invitación; esto decide qué ven en tu calendario quienes ya lo tienen compartido.
 *
 * La regla que gobierna las tres opciones: **solo restringen, nunca amplían**. El
 * nivel que le diste a cada persona sobre tu calendario es el techo. Si a alguien le
 * compartes en modo «solo ocupación», elegirlo aquí no le enseña el título — seguiría
 * viendo el bloque. Lo contrario convertiría este ajuste en una forma de saltarse lo
 * que decidiste para esa persona.
 */
export function VisibilityField({
  visibility,
  onVisibilityChange,
  viewerIds,
  onViewerIdsChange,
  error,
}: {
  visibility: ActivityVisibility;
  onVisibilityChange: (value: ActivityVisibility) => void;
  viewerIds: string[];
  onViewerIdsChange: (ids: string[]) => void;
  error?: string;
}) {
  const theme = useTheme();
  const contacts = useContacts();
  const tx = useT();
  const aceptados = (contacts.data ?? []).filter((c) => c.kind === 'accepted');
  /** Quien no tenga «con detalles» verá el bloque ocupado elijas lo que elijas. */
  const conDetalles = aceptados.filter((c) => c.myCalendarVisibility === 'details');

  const alternar = (id: string) =>
    onViewerIdsChange(viewerIds.includes(id) ? viewerIds.filter((x) => x !== id) : [...viewerIds, id]);

  const explicacion =
    visibility === 'private'
      ? tx.calendar.visibility.privateHint
      : visibility === 'selected'
        ? tx.calendar.visibility.selectedHint
        : conDetalles.length > 0
          ? tx.calendar.visibility.defaultHintSome(conDetalles.length)
          : tx.calendar.visibility.defaultHintNone;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {visibility === 'private' ? (
          <EyeOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        ) : (
          <Eye size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        )}
        <AppText variant="label" color="textSecondary">
          {tx.calendar.visibility.title}
        </AppText>
      </View>

      <Segmented options={OPCIONES.map((v) => ({ value: v, label: tx.calendar.visibility.options[v] }))} value={visibility} onChange={onVisibilityChange} />

      <AppText variant="caption" color="textTertiary">
        {explicacion}
      </AppText>

      {visibility === 'selected' ? (
        aceptados.length === 0 ? (
          <AppText variant="caption" color="textTertiary">
            {tx.calendar.visibility.noContacts}
          </AppText>
        ) : (
          <View style={styles.lista}>
            {aceptados.map((c) => {
              const marcado = viewerIds.includes(c.profile.id);
              const verá = marcado && c.myCalendarVisibility === 'details';
              return (
                <Pressable
                  key={c.profile.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcado }}
                  accessibilityLabel={c.profile.display_name?.split(' ')[0] ?? c.profile.username}
                  onPress={() => alternar(c.profile.id)}
                  style={({ pressed }) => [
                    styles.fila,
                    { borderColor: marcado ? theme.ink : theme.border },
                    pressed ? { backgroundColor: theme.surfaceAlt } : null,
                  ]}>
                  <Avatar profile={c.profile} size={32} />
                  <View style={styles.texto}>
                    <AppText variant="bodyStrong">
                      {c.profile.display_name ?? c.profile.username}
                    </AppText>
                    {marcado && !verá ? (
                      <AppText variant="caption" color="textTertiary">
                        {tx.calendar.visibility.busyOnlyFor}
                      </AppText>
                    ) : null}
                  </View>
                  {marcado ? <Check size={IconSize.inline} strokeWidth={IconStroke} color={theme.ink} /> : null}
                </Pressable>
              );
            })}
          </View>
        )
      ) : null}

      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}

      {visibility !== 'private' ? (
        <View style={styles.pie}>
          <Users size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
          <AppText variant="caption" color="textTertiary">
            {tx.calendar.visibility.inviteHint}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  lista: { gap: Spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  texto: { flex: 1, gap: 2 },
  pie: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
