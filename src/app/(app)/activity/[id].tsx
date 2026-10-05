import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, BellOff, Dumbbell, LogOut, Pencil, Repeat, Share2, Trash2, Users } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { activityColor } from '@/components/calendar';
import { ModalHeader } from '@/components/modal-header';
import { ActionRow, AppText, Button, ErrorState, LoadingState, Screen, Sheet, SwitchRow, ThemeIcon } from '@/components/ui';
import { describeOffset } from '@/constants/reminders';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivity, useActivityMutations } from '@/hooks/use-activity';
import { useActivityReminders, useReminderMutations } from '@/hooks/use-reminders';
import { useActivityShares, useShareMutations } from '@/hooks/use-shares';
import { useWorkoutByActivity, useWorkoutMutations } from '@/hooks/use-workouts';
import { useTheme } from '@/hooks/use-theme';
import { formatDayTitle, formatTimeRange, fromIso } from '@/lib/dates';
import { describeRecurrence, parseRRule } from '@/lib/recurrence';
import { useAuth, useConfirm, useSnackbar } from '@/providers';
import type { RecurrenceScope } from '@/services/activities';
import { useLanguage, useT } from '@/i18n';

const DETAIL_MAX_WIDTH = 560;

/** Localiza el id de mi share aceptado para poder salirme (RF-S6). */
async function findMyShare(activityId: string): Promise<string | null> {
  const { listActivityShares } = await import('@/services/shares');
  const { getSession } = await import('@/services/auth');
  const me = await getSession();
  const all = await listActivityShares(activityId);
  return all.find((s) => s.shared_with_id === me?.id)?.id ?? null;
}

type PendingAction = 'edit' | 'delete';

/** Hoja de detalle de actividad: editar y eliminar, con "solo esta / toda la serie" (RF-C7, RF-C8). */
export default function ActivityDetailScreen() {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const activity = useActivity(id);
  const parent = useActivity(activity.data?.recurrence_parent_id ?? undefined);
  const { remove, create } = useActivityMutations();
  const reminders = useActivityReminders(id);
  const { setEnabled } = useReminderMutations();
  const isOwner = !!activity.data && activity.data.owner_id === userId;
  const shares = useActivityShares(id, isOwner);
  const shareMutations = useShareMutations();
  // Los entrenamientos son privados: solo el dueño consulta o crea el suyo (regla 07).
  const workout = useWorkoutByActivity(id, isOwner && !!activity.data?.is_gym);
  const workoutMutations = useWorkoutMutations();
  const [pending, setPending] = useState<PendingAction | null>(null);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar'));

  if (activity.isPending) {
    return (
      <Screen modal maxWidth={DETAIL_MAX_WIDTH}>
        <ModalHeader title={tx.calendar.detail.title} />
        <LoadingState />
      </Screen>
    );
  }
  if (activity.isError) {
    return (
      <Screen modal maxWidth={DETAIL_MAX_WIDTH}>
        <ModalHeader title={tx.calendar.detail.title} />
        <ErrorState message={activity.error.message} onRetry={() => activity.refetch()} />
      </Screen>
    );
  }

  const data = activity.data;
  const color = activityColor(data, theme);
  const invitados = shares.data ?? [];
  const porRespuesta = {
    accepted: invitados.filter((s) => s.status === 'accepted'),
    maybe: invitados.filter((s) => s.status === 'maybe'),
    declined: invitados.filter((s) => s.status === 'declined'),
    pending: invitados.filter((s) => s.status === 'pending'),
  };
  const isSeries = !!data.recurrence_rule || !!data.recurrence_parent_id;
  const rule = parseRRule(data.recurrence_rule ?? parent.data?.recurrence_rule ?? null);

  const edit = (scope: RecurrenceScope) => router.push({ pathname: '/(app)/activity/new', params: { id: data.id, scope } });

  const doDelete = async (scope: RecurrenceScope) => {
    const ok = await confirm({
      title: scope === 'series' ? tx.calendar.detail.deleteSeries : tx.calendar.detail.deleteActivity,
      message: scope === 'series' ? tx.calendar.detail.deleteSeriesMessage(data.title) : tx.calendar.detail.deleteMessage(data.title),
      confirmLabel: tx.calendar.detail.delete,
      destructive: true,
    });
    if (!ok) return;
    const snapshot = data;
    remove.mutate(
      { id: data.id, scope },
      {
        onSuccess: () => {
          close();
          showSnackbar({
            message: scope === 'series' ? tx.calendar.detail.seriesDeleted : tx.calendar.detail.deleted,
            actionLabel: scope === 'series' ? undefined : tx.calendar.detail.undo,
            onAction:
              scope === 'series'
                ? undefined
                : () =>
                    create.mutate({
                      title: snapshot.title,
                      description: snapshot.description,
                      theme_id: snapshot.theme_id,
                      dimension: snapshot.dimension,
                      color: snapshot.color,
                      icon: snapshot.icon,
                      start_at: snapshot.start_at,
                      end_at: snapshot.end_at,
                      all_day: snapshot.all_day,
                      is_gym: snapshot.is_gym,
                    }),
          });
        },
      },
    );
  };

  const runWithScope = (action: PendingAction, scope: RecurrenceScope) => {
    setPending(null);
    if (action === 'edit') edit(scope);
    else void doDelete(scope);
  };

  return (
    <Screen modal scroll maxWidth={DETAIL_MAX_WIDTH}>
      <ModalHeader title={tx.calendar.detail.title} />
      <View style={styles.hero}>
        <View style={[styles.iconBadge, { backgroundColor: color }]}>
          <ThemeIcon name={data.icon} color="#FFFFFF" size={IconSize.action} />
        </View>
        <View style={styles.heroText}>
          <AppText variant="title">{data.title}</AppText>
          <AppText color="textSecondary">{formatDayTitle(fromIso(data.start_at), lang)}</AppText>
          <AppText color="textSecondary" tabular>
            {formatTimeRange(data.start_at, data.end_at, data.all_day, lang)}
          </AppText>
          {!isOwner ? (
            <View style={styles.inline}>
              <Users size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
              <AppText variant="caption" color="textTertiary">
                {tx.calendar.detail.sharedBy(data.owner_name ?? null)}
              </AppText>
            </View>
          ) : null}
          {isSeries ? (
            <View style={styles.inline}>
              <Repeat size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
              <AppText variant="caption" color="textTertiary">
                {describeRecurrence(rule, lang)}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {data.description ? (
        <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
          <AppText>{data.description}</AppText>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
        <View style={styles.inline}>
          {reminders.data?.length ? (
            <Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          ) : (
            <BellOff size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
          )}
          <AppText variant="label" color="textSecondary">
            {tx.calendar.detail.reminders}
          </AppText>
        </View>
        {reminders.data?.length ? (
          reminders.data.map((r) => (
            <SwitchRow
              key={r.id}
              label={describeOffset(r.offset_minutes, lang)}
              hint={r.enabled ? undefined : tx.calendar.detail.mutedForYou}
              value={r.enabled}
              onValueChange={(enabled) => setEnabled.mutate({ reminderId: r.id, enabled })}
            />
          ))
        ) : isOwner ? (
          <Button
            title={tx.calendar.detail.addReminders}
            variant="secondary"
            icon={<Bell size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
            onPress={() =>
              router.push({
                pathname: '/(app)/activity/new',
                params: { id: data.id, scope: isSeries ? 'series' : 'this', focus: 'reminders' },
              })
            }
          />
        ) : (
          <AppText variant="caption" color="textTertiary">
            {tx.calendar.detail.noReminders}
          </AppText>
        )}
      </View>

      {/* Lista de invitados con su respuesta (RF-S19). Se agrupa por respuesta en
          vez de listar en orden de invitación: la pregunta que se hace quien
          organiza es «¿cuántos vienen?», no «¿a quién invité?». */}
      {isOwner && invitados.length > 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
          <View style={styles.inline}>
            <Users size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
            <AppText variant="label" color="textSecondary">
              {tx.calendar.detail.guests(porRespuesta.accepted.length, invitados.length)}
            </AppText>
          </View>
          {(
            [
              ['accepted', tx.calendar.detail.rsvp.accepted, 'success'],
              ['maybe', tx.calendar.detail.rsvp.maybe, 'text'],
              ['declined', tx.calendar.detail.rsvp.declined, 'textTertiary'],
              ['pending', tx.calendar.detail.rsvp.pending, 'textTertiary'],
            ] as const
          ).map(([clave, etiqueta, color]) =>
            porRespuesta[clave].length > 0 ? (
              <View key={clave} style={styles.inline}>
                <AppText variant="caption" color={color}>
                  {etiqueta}:
                </AppText>
                <AppText variant="caption" color="textSecondary" style={styles.invitados}>
                  {porRespuesta[clave].map((s) => s.profile.display_name?.split(' ')[0] ?? tx.calendar.contactFallback).join(', ')}
                </AppText>
              </View>
            ) : null,
          )}
        </View>
      ) : null}

      {isOwner && data.is_gym ? (
        <Button
          title={workout.data ? tx.calendar.detail.viewWorkout : tx.calendar.detail.logWorkout}
          icon={<Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />}
          loading={workout.isPending || workoutMutations.create.isPending}
          onPress={() => {
            if (workout.data) {
              router.push({ pathname: '/(app)/workout/[id]', params: { id: workout.data.id, mode: 'view' } });
              return;
            }
            workoutMutations.create.mutate(
              // Registrar desde la actividad abre la sesión en vivo (spec 07 v2, RF-F38).
              { activity_id: data.id, performed_at: data.start_at, status: 'active' },
              { onSuccess: (created) => router.push({ pathname: '/(app)/workout/[id]', params: { id: created.id, mode: 'edit' } }) },
            );
          }}
        />
      ) : null}

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        {isOwner ? (
          <>
            <ActionRow
              icon={<Pencil size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
              label={tx.calendar.detail.edit}
              onPress={() => (isSeries ? setPending('edit') : edit('this'))}
            />
            <ActionRow
              icon={<Share2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
              label={tx.calendar.detail.share}
              onPress={() => router.push({ pathname: '/(app)/activity/share', params: { id: data.id } })}
            />
            <ActionRow
              icon={<Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
              label={tx.calendar.detail.delete}
              color="danger"
              onPress={() => (isSeries ? setPending('delete') : void doDelete('this'))}
              disabled={remove.isPending}
            />
          </>
        ) : (
          <ActionRow
            icon={<LogOut size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
            label={tx.calendar.detail.leave}
            color="danger"
            disabled={shareMutations.remove.isPending}
            onPress={async () => {
              const ok = await confirm({ title: tx.calendar.detail.leaveTitle, message: tx.calendar.detail.leaveMessage, confirmLabel: tx.calendar.detail.leaveConfirm, destructive: true });
              if (!ok) return;
              const myShare = await findMyShare(data.id);
              if (myShare) shareMutations.remove.mutate(myShare, { onSuccess: () => { showSnackbar({ message: tx.calendar.detail.left }); close(); } });
            }}
          />
        )}
      </View>

      <Sheet visible={pending !== null} onClose={() => setPending(null)} title={tx.calendar.detail.scopeQuestion}>
        <AppText color="textSecondary">Esta actividad se repite. Elige qué quieres {pending === 'delete' ? 'eliminar' : 'editar'}.</AppText>
        <View style={styles.scopeActions}>
          <Button title={tx.calendar.detail.onlyThis} variant="secondary" onPress={() => pending && runWithScope(pending, 'this')} />
          <Button title={tx.calendar.detail.wholeSeries} onPress={() => pending && runWithScope(pending, 'series')} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  iconBadge: { width: 48, height: 48, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: Spacing.xs },
  invitados: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  card: { padding: Spacing.lg, borderRadius: Radius.md, borderCurve: 'continuous' },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.xs },
  scopeActions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
