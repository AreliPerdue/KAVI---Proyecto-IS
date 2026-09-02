import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { ActivityForm } from '@/components/calendar/activity-form';
import { activityToFormValues, defaultFormValues, formValuesToInput } from '@/components/calendar/activity-form-mapping';
import { ModalHeader } from '@/components/modal-header';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useActivity, useActivityMutations } from '@/hooks/use-activity';
import { useThemes } from '@/hooks/use-themes';
import { useSnackbar } from '@/providers';
import type { RecurrenceScope } from '@/services/activities';

const FORM_MAX_WIDTH = 640;

type Params = { id?: string; date?: string; start?: string; end?: string; title?: string; scope?: RecurrenceScope };

/** Crear (sin id) o editar (con id) una actividad (RF-C5, RF-C6, RF-C8). */
export default function ActivityFormScreen() {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const { id, date, start, end, title, scope = 'this' } = useLocalSearchParams<Params>();
  const editing = !!id;
  const activity = useActivity(id);
  const parent = useActivity(activity.data?.recurrence_parent_id ?? undefined);
  const themes = useThemes();
  const { create, update } = useActivityMutations();

  const isSeriesMember = !!activity.data && (!!activity.data.recurrence_rule || !!activity.data.recurrence_parent_id);
  const seriesRule = activity.data?.recurrence_rule ?? parent.data?.recurrence_rule ?? null;

  const defaults = useMemo(() => {
    if (activity.data) return activityToFormValues(activity.data, scope === 'series' ? seriesRule : null);
    return defaultFormValues({
      dayKey: date,
      startMinutes: start ? Number(start) : undefined,
      endMinutes: end ? Number(end) : undefined,
      title,
    });
  }, [activity.data, date, start, end, title, scope, seriesRule]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar'));
  const headerTitle = editing ? (scope === 'series' ? 'Editar toda la serie' : 'Editar actividad') : 'Nueva actividad';

  if (editing && (activity.isPending || (activity.data?.recurrence_parent_id && parent.isPending))) {
    return (
      <Screen maxWidth={FORM_MAX_WIDTH}>
        <ModalHeader title={headerTitle} />
        <LoadingState />
      </Screen>
    );
  }
  if (editing && activity.isError) {
    return (
      <Screen maxWidth={FORM_MAX_WIDTH}>
        <ModalHeader title={headerTitle} />
        <ErrorState message={activity.error.message} onRetry={() => activity.refetch()} />
      </Screen>
    );
  }

  const mutation = editing ? update : create;

  return (
    <Screen scroll maxWidth={FORM_MAX_WIDTH}>
      <ModalHeader title={headerTitle} />
      <ActivityForm
        key={editing ? `${id}-${scope}` : 'new'}
        defaultValues={defaults}
        submitLabel={editing ? 'Guardar cambios' : 'Crear actividad'}
        submitting={mutation.isPending}
        error={mutation.error?.message ?? null}
        recurrenceLocked={editing && isSeriesMember && scope === 'this'}
        onSubmit={(values) => {
          const selectedTheme = themes.data?.find((t) => t.id === values.themeId) ?? null;
          const input = formValuesToInput(values, selectedTheme);
          if (editing) {
            const { recurrence, ...patch } = input;
            update.mutate(
              { id, patch: scope === 'series' ? { ...patch, recurrence } : patch, scope },
              {
                onSuccess: () => {
                  showSnackbar({ message: scope === 'series' ? 'Serie actualizada.' : 'Cambios guardados.' });
                  close();
                },
              },
            );
          } else {
            create.mutate(input, {
              onSuccess: () => {
                showSnackbar({ message: input.recurrence ? 'Actividad recurrente creada.' : 'Actividad creada.' });
                close();
              },
            });
          }
        }}
      />
    </Screen>
  );
}
