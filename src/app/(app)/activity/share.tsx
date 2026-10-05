import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, CircleAlert, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { AppText, Avatar, Banner, Button, EmptyState, ErrorState, IconButton, LoadingState, Screen } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivity } from '@/hooks/use-activity';
import { useAvailability } from '@/hooks/use-availability';
import { useContacts } from '@/hooks/use-connections';
import { useActivityShares, useShareMutations } from '@/hooks/use-shares';
import { useTheme } from '@/hooks/use-theme';
import { formatTime, fromIso } from '@/lib/dates';
import { useSnackbar } from '@/providers';
import { useLanguage, useT } from '@/i18n';

const MAX_WIDTH = 560;


/** Choque de horario de un contacto con la actividad que se va a compartir (RF-S16). */
type Conflict = { from: string; to: string; title: string | null };

/** Compartir una actividad con contactos aceptados (RF-S4); ver y revocar shares. */
export default function ShareActivityScreen() {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contacts = useContacts();
  const shares = useActivityShares(id);
  const { share, remove } = useShareMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const activity = useActivity(id);

  const accepted = (contacts.data ?? []).filter((c) => c.kind === 'accepted');
  const sharedIds = new Set((shares.data ?? []).map((s) => s.shared_with_id));
  const candidates = accepted.filter((c) => !sharedIds.has(c.profile.id));

  /**
   * Se consulta la disponibilidad de quienes comparten su calendario, en el rango exacto
   * de la actividad, para avisar antes de invitar a alguien que ya está ocupado (RF-S16).
   */
  const sharingIds = useMemo(
    () => candidates.filter((c) => c.theirCalendarVisibility).map((c) => c.profile.id),
    [candidates],
  );
  const range = useMemo(() => {
    if (!activity.data) return null;
    return { from: fromIso(activity.data.start_at), to: fromIso(activity.data.end_at) };
  }, [activity.data]);
  const availability = useAvailability(range ? sharingIds : [], range ?? { from: new Date(), to: new Date() });

  const conflictsByUser = useMemo(() => {
    const map = new Map<string, Conflict[]>();
    for (const block of availability.data ?? []) {
      const list = map.get(block.user_id) ?? [];
      list.push({ from: block.start_at, to: block.end_at, title: block.title });
      map.set(block.user_id, list);
    }
    return map;
  }, [availability.data]);

  const describeConflict = (userId: string): string | null => {
    const list = conflictsByUser.get(userId);
    if (!list || list.length === 0) return null;
    const first = list[0] as Conflict;
    const when = `${formatTime(fromIso(first.from), lang)}–${formatTime(fromIso(first.to), lang)}`;
    return tx.calendar.share.busy(when, first.title ?? null, list.length - 1);
  };

  const selectedWithConflict = [...selected].filter((userId) => conflictsByUser.has(userId)).length;

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader title={tx.calendar.share.title} />
      {share.error ? <Banner tone="error" message={share.error.message} /> : null}
      {contacts.isPending || shares.isPending ? <LoadingState /> : null}
      {/* El error de la mutacion ya se avisa arriba; sin esta rama, un fallo al
          cargar contactos o shares dejaba la pantalla vacia (NFR-11). */}
      {contacts.isError ? (
        <ErrorState message={contacts.error.message} onRetry={() => contacts.refetch()} />
      ) : null}

      {(shares.data?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <AppText variant="label" color="textSecondary">
            {tx.calendar.share.sharedWith}
          </AppText>
          {shares.data?.map((s) => (
            <View key={s.id} style={[styles.row, { borderColor: theme.border }]}>
              <Avatar profile={s.profile} />
              <View style={styles.text}>
                <AppText variant="bodyStrong">{s.profile.display_name ?? tx.calendar.contactFallback}</AppText>
                <AppText variant="caption" color={s.status === 'declined' ? 'danger' : 'textSecondary'}>
                  {tx.calendar.share.status[s.status]}
                </AppText>
              </View>
              <IconButton label={tx.calendar.share.stopSharing(s.profile.display_name ?? null)} onPress={() => remove.mutate(s.id)}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              </IconButton>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label" color="textSecondary">
          {tx.calendar.share.pickContacts}
        </AppText>
        {contacts.isSuccess && candidates.length === 0 ? (
          <EmptyState
            title={accepted.length === 0 ? tx.calendar.share.noContactsYet : tx.calendar.share.sharedWithAll}
            description={accepted.length === 0 ? tx.calendar.share.addContactsHint : undefined}
          />
        ) : null}
        {candidates.map((c) => {
          const isSelected = selected.has(c.profile.id);
          const conflict = describeConflict(c.profile.id);
          return (
            <Pressable
              key={c.profile.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={c.profile.display_name ?? tx.calendar.contactFallback}
              onPress={() => toggle(c.profile.id)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: isSelected ? theme.ink : conflict ? theme.today : theme.border },
                pressed ? { backgroundColor: theme.surfaceAlt } : null,
              ]}>
              <Avatar profile={c.profile} />
              <View style={styles.text}>
                <AppText variant="bodyStrong">{c.profile.display_name ?? tx.calendar.contactFallback}</AppText>
                {conflict ? (
                  <View style={styles.conflict}>
                    <CircleAlert size={14} strokeWidth={IconStroke} color={theme.today} />
                    <AppText variant="caption" style={{ color: theme.today }} numberOfLines={2}>
                      {conflict}
                    </AppText>
                  </View>
                ) : !c.theirCalendarVisibility ? (
                  <AppText variant="caption" color="textTertiary">
                    {tx.calendar.share.noAvailability}
                  </AppText>
                ) : (
                  <AppText variant="caption" color="textSecondary">
                    {tx.calendar.share.free}
                  </AppText>
                )}
              </View>
              <View style={[styles.check, { borderColor: isSelected ? theme.ink : theme.border, backgroundColor: isSelected ? theme.ink : 'transparent' }]}>
                {isSelected ? <Check size={16} strokeWidth={3} color={theme.onInk} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedWithConflict > 0 ? (
        <Banner
          tone="info"
          message={
            selectedWithConflict === 1
              ? tx.calendar.share.conflictOne
              : tx.calendar.share.conflictMany(selectedWithConflict)
          }
        />
      ) : null}

      <Button
        title={selected.size > 1 ? tx.calendar.share.shareWithN(selected.size) : tx.calendar.share.share}
        disabled={selected.size === 0}
        loading={share.isPending}
        onPress={() =>
          share.mutate(
            { activityId: id, contactUserIds: [...selected] },
            {
              onSuccess: () => {
                showSnackbar({ message: tx.calendar.share.invitationSent });
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
  conflict: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
