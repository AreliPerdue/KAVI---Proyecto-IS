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
        <ModalHeader title="Actividad" />
        <LoadingState />
      </Screen>
    );
  }
  if (activity.isError) {
    return (
      <Screen modal maxWidth={DETAIL_MAX_WIDTH}>
        <ModalHeader title="Actividad" />
        <ErrorState message={activity.error.message} onRetry={() => activity.refetch()} />
      </Screen>
    );
  }

  const data = activity.data;
  const color = activityColor(data, theme);
  const acceptedShares = (shares.data ?? []).filter((s) => s.status === 'accepted');
  const pendingShares = (shares.data ?? []).filter((s) => s.status === 'pending');
  const isSeries = !!data.recurrence_rule || !!data.recurrence_parent_id;
  const rule = parseRRule(data.recurrence_rule ?? parent.data?.recurrence_rule ?? null);

  const edit = (scope: RecurrenceScope) => router.push({ pathname: '/(app)/activity/new', params: { id: data.id, scope } });

  const doDelete = async (scope: RecurrenceScope) => {
    const ok = await confirm({
      title: scope === 'series' ? 'Eliminar toda la serie' : 'Eliminar actividad',
      message: scope === 'series' ? `Se eliminará "${data.title}" y sus próximas repeticiones.` : `Se eliminará "${data.title}".`,
      confirmLabel: 'Eliminar',
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
            message: scope === 'series' ? 'Serie eliminada.' : 'Actividad eliminada.',
            actionLabel: scope === 'series' ? undefined : 'Deshacer',
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
      <ModalHeader title="Actividad" />
      <View style={styles.hero}>
        <View style={[styles.iconBadge, { backgroundColor: color }]}>
          <ThemeIcon name={data.icon} color="#FFFFFF" size={IconSize.action} />
        </View>
        <View style={styles.heroText}>
          <AppText variant="title">{data.title}</AppText>
          <AppText color="textSecondary">{formatDayTitle(fromIso(data.start_at))}</AppText>
          <AppText color="textSecondary" tabular>
            {formatTimeRange(data.start_at, data.end_at, data.all_day)}
          </AppText>
          {!isOwner ? (
            <View style={styles.inline}>
              <Users size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
              <AppText variant="caption" color="textTertiary">
                Compartida por {data.owner_name ?? 'un contacto'} · solo lectura
              </AppText>
            </View>
          ) : null}
          {isSeries ? (
            <View style={styles.inline}>
              <Repeat size={14} strokeWidth={IconStroke} color={theme.textTertiary} />
              <AppText variant="caption" color="textTertiary">
                {describeRecurrence(rule)}
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
            Recordatorios
          </AppText>
        </View>
        {reminders.data?.length ? (
          reminders.data.map((r) => (
            <SwitchRow
              key={r.id}
              label={describeOffset(r.offset_minutes)}
              hint={r.enabled ? undefined : 'Silenciado solo para ti'}
              value={r.enabled}
              onValueChange={(enabled) => setEnabled.mutate({ reminderId: r.id, enabled })}
            />
          ))
        ) : (
          <AppText variant="caption" color="textTertiary">
            Sin recordatorios. Agrégalos desde Editar.
          </AppText>
        )}
      </View>

      {isOwner && (acceptedShares.length > 0 || pendingShares.length > 0) ? (
        <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
          <View style={styles.inline}>
            <Users size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
            <AppText variant="label" color="textSecondary">
              Compartida con
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary">
            {acceptedShares.map((s) => s.profile.display_name ?? 'Contacto').join(', ') || 'Nadie aún'}
            {pendingShares.length ? ` · ${pendingShares.length} pendiente${pendingShares.length > 1 ? 's' : ''}` : ''}
          </AppText>
        </View>
      ) : null}

      {isOwner && data.is_gym ? (
        <Button
          title={workout.data ? 'Ver entrenamiento' : 'Registrar entrenamiento'}
          icon={<Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />}
          loading={workout.isPending || workoutMutations.create.isPending}
          onPress={() => {
            if (workout.data) {
              router.push({ pathname: '/(app)/workout/[id]', params: { id: workout.data.id, mode: 'view' } });
              return;
            }
            workoutMutations.create.mutate(
              { activity_id: data.id, performed_at: data.start_at },
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
              label="Editar"
              onPress={() => (isSeries ? setPending('edit') : edit('this'))}
            />
            <ActionRow
              icon={<Share2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
              label="Compartir"
              onPress={() => router.push({ pathname: '/(app)/activity/share', params: { id: data.id } })}
            />
            <ActionRow
              icon={<Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
              label="Eliminar"
              color="danger"
              onPress={() => (isSeries ? setPending('delete') : void doDelete('this'))}
              disabled={remove.isPending}
            />
          </>
        ) : (
          <ActionRow
            icon={<LogOut size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
            label="Salir de esta actividad"
            color="danger"
            disabled={shareMutations.remove.isPending}
            onPress={async () => {
              const ok = await confirm({ title: 'Salir de la actividad', message: 'Dejará de aparecer en tu calendario.', confirmLabel: 'Salir', destructive: true });
              if (!ok) return;
              const myShare = await findMyShare(data.id);
              if (myShare) shareMutations.remove.mutate(myShare, { onSuccess: () => { showSnackbar({ message: 'Saliste de la actividad.' }); close(); } });
            }}
          />
        )}
      </View>

      <Sheet visible={pending !== null} onClose={() => setPending(null)} title="¿Solo esta ocurrencia o toda la serie?">
        <AppText color="textSecondary">Esta actividad se repite. Elige qué quieres {pending === 'delete' ? 'eliminar' : 'editar'}.</AppText>
        <View style={styles.scopeActions}>
          <Button title="Solo esta ocurrencia" variant="secondary" onPress={() => pending && runWithScope(pending, 'this')} />
          <Button title="Toda la serie" onPress={() => pending && runWithScope(pending, 'series')} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  iconBadge: { width: 48, height: 48, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: Spacing.xs },
  inline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  card: { padding: Spacing.lg, borderRadius: Radius.md, borderCurve: 'continuous' },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.xs },
  scopeActions: { gap: Spacing.sm, marginTop: Spacing.sm },
});
