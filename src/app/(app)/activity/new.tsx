import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import type { ScrollView } from 'react-native';

import { ActivityForm } from '@/components/calendar/activity-form';
import { activityToFormValues, defaultFormValues, formValuesToInput } from '@/components/calendar/activity-form-mapping';
import { ModalHeader } from '@/components/modal-header';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useActivity, useActivityMutations } from '@/hooks/use-activity';
import { useWorkoutByActivity, useWorkoutMutations } from '@/hooks/use-workouts';
import { useActivityReminders, useReminderMutations } from '@/hooks/use-reminders';
import { useThemes } from '@/hooks/use-themes';
import { useSnackbar } from '@/providers';
import type { ExerciseDraft } from '@/components/calendar/workout-draft';
import type { RecurrenceScope } from '@/services/activities';

const FORM_MAX_WIDTH = 640;

type Params = { id?: string; date?: string; start?: string; end?: string; title?: string; scope?: RecurrenceScope; focus?: 'reminders' };

/** Crear (sin id) o editar (con id) una actividad (RF-C5, RF-C6, RF-C8). */
export default function ActivityFormScreen() {
  const router = useRouter();
  const showSnackbar = useSnackbar();
  const { id, date, start, end, title, scope = 'this', focus } = useLocalSearchParams<Params>();
  /**
   * Al abrir desde «Agregar recordatorios» el formulario se desplaza hasta esa
   * sección: es larga y, sin esto, la persona aterriza en el título y tiene que
   * buscar dónde estaba lo que venía a hacer.
   */
  const scrollRef = useRef<ScrollView>(null);
  const remindersY = useRef<number | null>(null);
  const yaEnfocado = useRef(false);
  const enfocarRecordatorios = (y: number) => {
    remindersY.current = y;
    if (focus !== 'reminders' || yaEnfocado.current) return;
    yaEnfocado.current = true;
    // Un margen arriba para que la sección no quede pegada al borde.
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  };
  const editing = !!id;
  const activity = useActivity(id);
  const parent = useActivity(activity.data?.recurrence_parent_id ?? undefined);
  const themes = useThemes();
  const { create, update } = useActivityMutations();
  const reminders = useActivityReminders(id);
  const { setForActivity } = useReminderMutations();
  // Al editar una actividad de gimnasio se abre el entrenamiento existente en vez de duplicarlo.
  const existingWorkout = useWorkoutByActivity(id, editing);
  const workouts = useWorkoutMutations();

  /** Crea el entrenamiento de la actividad y le añade los ejercicios en orden (RF-F9). */
  const saveExercises = async (activityId: string, performedAt: string, exercises: ExerciseDraft[]) => {
    const usable = exercises.filter((e) => e.name.trim().length > 0);
    if (usable.length === 0) return;
    const workout = await workouts.create.mutateAsync({ activity_id: activityId, performed_at: performedAt });
    for (const [index, draft] of usable.entries()) {
      const { key: _key, ...input } = draft;
      await workouts.addExercise.mutateAsync({ workoutId: workout.id, input: { ...input, name: draft.name.trim(), position: index } });
    }
  };

  const isSeriesMember = !!activity.data && (!!activity.data.recurrence_rule || !!activity.data.recurrence_parent_id);
  const seriesRule = activity.data?.recurrence_rule ?? parent.data?.recurrence_rule ?? null;

  const defaults = useMemo(() => {
    if (activity.data) {
      return activityToFormValues(activity.data, scope === 'series' ? seriesRule : null, (reminders.data ?? []).map((r) => r.offset_minutes));
    }
    return defaultFormValues({
      dayKey: date,
      startMinutes: start ? Number(start) : undefined,
      endMinutes: end ? Number(end) : undefined,
      title,
    });
  }, [activity.data, date, start, end, title, scope, seriesRule, reminders.data]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/calendar'));
  const headerTitle = editing ? (scope === 'series' ? 'Editar toda la serie' : 'Editar actividad') : 'Nueva actividad';

  if (editing && (activity.isPending || reminders.isPending || (activity.data?.recurrence_parent_id && parent.isPending))) {
    return (
      <Screen modal maxWidth={FORM_MAX_WIDTH}>
        <ModalHeader title={headerTitle} />
        <LoadingState />
      </Screen>
    );
  }
  if (editing && activity.isError) {
    return (
      <Screen modal maxWidth={FORM_MAX_WIDTH}>
        <ModalHeader title={headerTitle} />
        <ErrorState message={activity.error.message} onRetry={() => activity.refetch()} />
      </Screen>
    );
  }

  const mutation = editing ? update : create;

  return (
    <Screen modal scroll maxWidth={FORM_MAX_WIDTH} scrollRef={scrollRef}>
      <ModalHeader title={headerTitle} />
      <ActivityForm
        onRemindersLayout={enfocarRecordatorios}
        key={editing ? `${id}-${scope}` : 'new'}
        defaultValues={defaults}
        submitLabel={editing ? 'Guardar cambios' : 'Crear actividad'}
        submitting={mutation.isPending || setForActivity.isPending}
        error={mutation.error?.message ?? null}
        recurrenceLocked={editing && isSeriesMember && scope === 'this'}
        existingWorkoutCount={editing && existingWorkout.data ? existingWorkout.data.exercises.length : undefined}
        onOpenExistingWorkout={
          existingWorkout.data
            ? () => {
                const workoutId = existingWorkout.data?.id;
                if (workoutId) router.push({ pathname: '/(app)/workout/[id]', params: { id: workoutId, mode: 'edit' } });
              }
            : undefined
        }
        onSubmit={(values, exercises) => {
          const selectedTheme = themes.data?.find((t) => t.id === values.themeId) ?? null;
          const input = formValuesToInput(values, selectedTheme);
          if (editing) {
            const { recurrence, ...patch } = input;
            update.mutate(
              { id, patch: scope === 'series' ? { ...patch, recurrence } : patch, scope },
              {
                onSuccess: (saved) =>
                  setForActivity.mutate(
                    { activityId: saved.id, offsets: values.reminderOffsets },
                    {
                      onSettled: () => {
                        showSnackbar({ message: scope === 'series' ? 'Serie actualizada.' : 'Cambios guardados.' });
                        close();
                      },
                    },
                  ),
              },
            );
          } else {
            create.mutate(input, {
              onSuccess: async (saved) => {
                if (values.isGym) {
                  await saveExercises(saved.id, saved.start_at, exercises).catch(() => {
                    // La actividad ya existe: no se pierde por un fallo al guardar la rutina.
                    showSnackbar({ message: 'Actividad creada, pero no se pudo guardar el entrenamiento.' });
                  });
                }
                const finish = () => {
                  showSnackbar({ message: input.recurrence ? 'Actividad recurrente creada.' : 'Actividad creada.' });
                  close();
                };
                if (values.reminderOffsets.length === 0) return finish();
                setForActivity.mutate({ activityId: saved.id, offsets: values.reminderOffsets }, { onSettled: finish });
              },
            });
          }
        }}
      />
    </Screen>
  );
}
