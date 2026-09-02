import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, Avatar, Banner, Button, EmptyState, IconButton, LoadingState, Screen } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useContacts } from '@/hooks/use-connections';
import { useActivityShares, useShareMutations } from '@/hooks/use-shares';
import { useTheme } from '@/hooks/use-theme';
import { useSnackbar } from '@/providers';

const MAX_WIDTH = 560;

const STATUS_LABEL = { pending: 'Pendiente', accepted: 'Aceptada', declined: 'Rechazada' } as const;

/** Compartir una actividad con contactos aceptados (RF-S4); ver y revocar shares. */
export default function ShareActivityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contacts = useContacts();
  const shares = useActivityShares(id);
  const { share, remove } = useShareMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const accepted = (contacts.data ?? []).filter((c) => c.kind === 'accepted');
  const sharedIds = new Set((shares.data ?? []).map((s) => s.shared_with_id));
  const candidates = accepted.filter((c) => !sharedIds.has(c.profile.id));

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  return (
    <Screen scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title="Compartir actividad" />
      {share.error ? <Banner tone="error" message={share.error.message} /> : null}
      {contacts.isPending || shares.isPending ? <LoadingState /> : null}

      {(shares.data?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color="textSecondary">
            Compartida con
          </AppText>
          {shares.data?.map((s) => (
            <View key={s.id} style={[styles.row, { borderColor: theme.border }]}>
              <Avatar profile={s.profile} />
              <View style={styles.text}>
                <AppText variant="bodyStrong">{s.profile.display_name ?? s.profile.username}</AppText>
                <AppText variant="caption" color={s.status === 'declined' ? 'danger' : 'textSecondary'}>
                  {STATUS_LABEL[s.status]}
                </AppText>
              </View>
              <IconButton label={`Dejar de compartir con ${s.profile.username}`} onPress={() => remove.mutate(s.id)}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label" color="textSecondary">
          Elegir contactos
        </AppText>
        {contacts.isSuccess && candidates.length === 0 ? (
          <EmptyState
            title={accepted.length === 0 ? 'Aún no tienes contactos' : 'Ya compartiste con todos tus contactos'}
            description={accepted.length === 0 ? 'Agrega contactos desde la pestaña Compartido.' : undefined}
          />
        ) : null}
        {candidates.map((c) => {
          const isSelected = selected.has(c.profile.id);
          return (
            <Pressable
              key={c.profile.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={c.profile.display_name ?? c.profile.username}
              onPress={() => toggle(c.profile.id)}
              style={({ pressed }) => [styles.row, { borderColor: isSelected ? theme.ink : theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
              <Avatar profile={c.profile} />
              <View style={styles.text}>
                <AppText variant="bodyStrong">{c.profile.display_name ?? c.profile.username}</AppText>
                <AppText variant="caption" color="textSecondary">
                  @{c.profile.username}
                </AppText>
              </View>
              <View style={[styles.check, { borderColor: isSelected ? theme.ink : theme.border, backgroundColor: isSelected ? theme.ink : 'transparent' }]}>
                {isSelected ? <Check size={16} strokeWidth={3} color={theme.onInk} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={selected.size > 1 ? `Compartir con ${selected.size} contactos` : 'Compartir'}
        disabled={selected.size === 0}
        loading={share.isPending}
        onPress={() =>
          share.mutate(
            { activityId: id, contactUserIds: [...selected] },
            {
              onSuccess: () => {
                showSnackbar({ message: 'Invitación enviada.' });
                setSelected(new Set());
                if (router.canGoBack()) router.back();
              },
            },
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 60, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  text: { flex: 1, gap: 2 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
