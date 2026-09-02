import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { activityColor } from '@/components/calendar';
import { ModalHeader } from '@/components/modal-header';
import { ActionRow, AppText, ErrorState, LoadingState, Screen, ThemeIcon } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivity, useActivityMutations } from '@/hooks/use-activity';
import { useTheme } from '@/hooks/use-theme';
import { formatDayTitle, formatTimeRange, fromIso } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';

const DETAIL_MAX_WIDTH = 560;

/** Hoja de detalle de actividad: editar y eliminar (RF-C7 parcial). */
export default function ActivityDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { id } = useLocalSearchParams<{ id: string }>();
  const activity = useActivity(id);
  const { remove, create } = useActivityMutations();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar'));

  if (activity.isPending) {
    return (
      <Screen maxWidth={DETAIL_MAX_WIDTH}>
        <ModalHeader title="Actividad" />
        <LoadingState />
      </Screen>
    );
  }
  if (activity.isError) {
    return (
      <Screen maxWidth={DETAIL_MAX_WIDTH}>
        <ModalHeader title="Actividad" />
        <ErrorState message={activity.error.message} onRetry={() => activity.refetch()} />
      </Screen>
    );
  }

  const data = activity.data;
  const color = activityColor(data, theme);

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Eliminar actividad',
      message: `Se eliminará "${data.title}".`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    const snapshot = data;
    remove.mutate(data.id, {
      onSuccess: () => {
        close();
        showSnackbar({
          message: 'Actividad eliminada.',
          actionLabel: 'Deshacer',
          onAction: () =>
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
    });
  };

  return (
    <Screen scroll maxWidth={DETAIL_MAX_WIDTH}>
      <ModalHeader title="Actividad" />
      <View style={styles.hero}>
        <View style={[styles.iconBadge, { backgroundColor: color }]}>
          <ThemeIcon name={data.icon} color={theme.onInk} size={IconSize.action} />
        </View>
        <View style={styles.heroText}>
          <AppText variant="title">{data.title}</AppText>
          <AppText color="textSecondary">{formatDayTitle(fromIso(data.start_at))}</AppText>
          <AppText color="textSecondary" tabular>
            {formatTimeRange(data.start_at, data.end_at, data.all_day)}
          </AppText>
        </View>
      </View>

      {data.description ? (
        <View style={[styles.card, { backgroundColor: theme.surfaceAlt }]}>
          <AppText>{data.description}</AppText>
        </View>
      ) : null}

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <ActionRow
          icon={<Pencil size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          label="Editar"
          onPress={() => router.push({ pathname: '/(app)/activity/new', params: { id: data.id } })}
        />
        <ActionRow
          icon={<Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />}
          label="Eliminar"
          color="danger"
          onPress={onDelete}
          disabled={remove.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  iconBadge: { width: 48, height: 48, borderRadius: Radius.md, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: Spacing.xs },
  card: { padding: Spacing.lg, borderRadius: Radius.md, borderCurve: 'continuous' },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, gap: Spacing.xs },
});
