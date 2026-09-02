import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';

import { ModalHeader } from '@/components/modal-header';
import { ActivityForm } from '@/components/calendar/activity-form';
import { activityToFormValues, defaultFormValues, formValuesToInput } from '@/components/calendar/activity-form-mapping';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useActivity, useActivityMutations } from '@/hooks/use-activity';
import { useSnackbar } from '@/providers';

const FORM_MAX_WIDTH = 640;

type Params = { id?: string; date?: string; start?: string };

/** Crear (sin id) o editar (con id) una actividad (RF-C5, RF-C6). */
export default function ActivityFormScreen() {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const { id, date, start } = useLocalSearchParams<Params>();
  const editing = !!id;
  const activity = useActivity(id);
  const { create, update } = useActivityMutations();

  const defaults = useMemo(() => {
    if (activity.data) return activityToFormValues(activity.data);
    return defaultFormValues({ dayKey: date, startMinutes: start ? Number(start) : undefined });
  }, [activity.data, date, start]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar'));

  if (editing && activity.isPending) {
    return (
      <Screen maxWidth={FORM_MAX_WIDTH}>
        <ModalHeader title="Editar actividad" />
        <LoadingState />
      </Screen>
    );
  }
  if (editing && activity.isError) {
    return (
      <Screen maxWidth={FORM_MAX_WIDTH}>
        <ModalHeader title="Editar actividad" />
        <ErrorState message={activity.error.message} onRetry={() => activity.refetch()} />
      </Screen>
    );
  }

  const mutation = editing ? update : create;

  return (
    <Screen scroll maxWidth={FORM_MAX_WIDTH}>
      <ModalHeader title={editing ? 'Editar actividad' : 'Nueva actividad'} />
      <ActivityForm
        key={editing ? id : 'new'}
        defaultValues={defaults}
        submitLabel={editing ? 'Guardar cambios' : 'Crear actividad'}
        submitting={mutation.isPending}
        error={mutation.error?.message ?? null}
        onSubmit={(values) => {
          const input = formValuesToInput(values);
          if (editing) {
            update.mutate(
              { id, patch: input },
              {
                onSuccess: () => {
                  showSnackbar({ message: 'Cambios guardados.' });
                  close();
                },
              },
            );
          } else {
            create.mutate(input, {
              onSuccess: () => {
                showSnackbar({ message: 'Actividad creada.' });
                close();
              },
            });
          }
        }}
      />
    </Screen>
  );
}
