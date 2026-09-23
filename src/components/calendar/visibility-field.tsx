import { Check, Eye, EyeOff, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Segmented, type SegmentedOption } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityVisibility } from '@/types/domain';

const OPCIONES: readonly SegmentedOption<ActivityVisibility>[] = [
  { value: 'default', label: 'Normal' },
  { value: 'selected', label: 'Algunos' },
  { value: 'private', label: 'Privada' },
];

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
  const aceptados = (contacts.data ?? []).filter((c) => c.kind === 'accepted');
  /** Quien no tenga «con detalles» verá el bloque ocupado elijas lo que elijas. */
  const conDetalles = aceptados.filter((c) => c.myCalendarVisibility === 'details');

  const alternar = (id: string) =>
    onViewerIdsChange(viewerIds.includes(id) ? viewerIds.filter((x) => x !== id) : [...viewerIds, id]);

  const explicacion =
    visibility === 'private'
      ? 'Nadie ve de qué se trata: todos ven el hueco como ocupado.'
      : visibility === 'selected'
        ? 'Solo quienes marques verán el título. Los demás, el hueco como ocupado.'
        : conDetalles.length > 0
          ? `Lo verán tus ${conDetalles.length} contactos con calendario «con detalles». Al resto les saldrá como ocupado.`
          : 'Lo verá quien tenga tu calendario «con detalles». Ahora mismo, nadie.';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {visibility === 'private' ? (
          <EyeOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        ) : (
          <Eye size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        )}
        <AppText variant="label" color="textSecondary">
          Quién la ve
        </AppText>
      </View>

      <Segmented options={OPCIONES} value={visibility} onChange={onVisibilityChange} />

      <AppText variant="caption" color="textTertiary">
        {explicacion}
      </AppText>

      {visibility === 'selected' ? (
        aceptados.length === 0 ? (
          <AppText variant="caption" color="textTertiary">
            Aún no tienes contactos a quien mostrársela.
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
                        Verá solo «ocupado»: no le compartes tu calendario con detalles.
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
            Para que alguien la tenga en su propio calendario, invítalo desde el detalle.
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
