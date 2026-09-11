import { addDays } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Copy, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExerciseCard } from '@/components/fitness/exercise-card';
import { ModalHeader } from '@/components/modal-header';
import { AppText, Banner, Button, DatePickerSheet, ErrorState, FieldButton, LoadingState, Screen, Sheet, SwitchRow, TextField } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivitiesRange } from '@/hooks/use-activities-range';
import { useTheme } from '@/hooks/use-theme';
import { useExerciseNames, useWorkout, useWorkoutMutations, useWorkouts } from '@/hooks/use-workouts';
import { formatDate, formatShortDate, formatTime, fromIso, startOfDay, toIso } from '@/lib/dates';
import { useConfirm, useSnackbar } from '@/providers';
import type { WorkoutExercise } from '@/types/domain';

const MAX_WIDTH = 640;

/** Pantalla de entrenamiento: captura/edición (RF-F3–F6) y lectura con Editar y Duplicar (RF-F8). */
export default function WorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'view' | 'edit' }>();
  const workout = useWorkout(id);
  const names = useExerciseNames();
  const mutations = useWorkoutMutations();
  const [editing, setEditing] = useState(mode !== 'view');
  const [saved, setSaved] = useState(false);
  const [pickingDate, setPickingDate] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [keepValues, setKeepValues] = useState(true);
  const [duration, setDuration] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);

  const data = workout.data;
  const markSaved = () => setSaved(true);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/fitness'));

  const saveExercise = (exercise: WorkoutExercise, patch: Parameters<typeof mutations.updateExercise.mutate>[0]['patch']) =>
    mutations.updateExercise.mutate({ id: exercise.id, patch }, { onSuccess: markSaved });

  const deleteExercise = (exercise: WorkoutExercise) => {
    const snapshot = exercise;
    mutations.removeExercise.mutate(exercise.id, {
      onSuccess: () =>
        showSnackbar({
          message: `"${snapshot.name || 'Ejercicio'}" eliminado.`,
          actionLabel: 'Deshacer',
          onAction: () =>
            mutations.addExercise.mutate({
              workoutId: snapshot.workout_id,
              input: { name: snapshot.name, sets: snapshot.sets, reps: snapshot.reps, weight: snapshot.weight, duration_minutes: snapshot.duration_minutes, notes: snapshot.notes, position: snapshot.position },
            }),
        }),
    });
  };

  const deleteWorkout = async () => {
    if (!data) return;
    const ok = await confirm({ title: 'Eliminar entrenamiento', message: 'Se borrarán sus ejercicios.', confirmLabel: 'Eliminar', destructive: true });
    if (!ok) return;
    mutations.remove.mutate(data.id, { onSuccess: () => { showSnackbar({ message: 'Entrenamiento eliminado.' }); close(); } });
  };

  if (workout.isPending) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title="Entrenamiento" />
        <LoadingState />
      </Screen>
    );
  }
  if (workout.isError || !data) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title="Entrenamiento" />
        <ErrorState message={workout.error?.message ?? 'Ese entrenamiento ya no existe.'} onRetry={() => workout.refetch()} />
      </Screen>
    );
  }

  const durationValue = duration ?? data.duration_minutes?.toString() ?? '';
  const notesValue = notes ?? data.notes ?? '';

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader
        title={editing ? 'Entrenamiento' : 'Entrenamiento'}
        right={
          editing ? (
            saved ? (
              <AppText variant="caption" color="textTertiary">
                Guardado
              </AppText>
            ) : null
          ) : (
            <Button title="Editar" variant="ghost" icon={<Pencil size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setEditing(true)} />
          )
        }
      />

      {mutations.update.error || mutations.addExercise.error ? (
        <Banner tone="error" message={(mutations.update.error ?? mutations.addExercise.error)?.message ?? ''} />
      ) : null}

      <View style={[styles.headerCard, { backgroundColor: theme.surfaceAlt }]}>
        {data.activity_title ? (
          <AppText variant="heading">{data.activity_title}</AppText>
        ) : (
          <AppText variant="heading">Entrenamiento libre</AppText>
        )}
        {editing ? (
          <>
            <FieldButton
              label="Fecha"
              value={`${formatDate(fromIso(data.performed_at))} · ${formatTime(fromIso(data.performed_at))}`}
              onPress={() => setPickingDate(true)}
              leading={<CalendarDays size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
            />
            <TextField
              label="Duración total (min)"
              value={durationValue}
              onChangeText={setDuration}
              onBlur={() => {
                const n = parseInt(durationValue, 10);
                mutations.update.mutate({ id: data.id, patch: { duration_minutes: Number.isFinite(n) && n > 0 ? n : null } }, { onSuccess: markSaved });
              }}
              keyboardType="number-pad"
              placeholder="Opcional"
            />
            <TextField
              label="Notas generales"
              value={notesValue}
              onChangeText={setNotes}
              onBlur={() => mutations.update.mutate({ id: data.id, patch: { notes: notesValue.trim() || null } }, { onSuccess: markSaved })}
              placeholder="Cómo te sentiste, qué cambiar…"
              multiline
            />
          </>
        ) : (
          <>
            <AppText color="textSecondary">
              {formatDate(fromIso(data.performed_at))} · {formatTime(fromIso(data.performed_at))}
              {data.duration_minutes ? ` · ${data.duration_minutes} min` : ''}
            </AppText>
            {data.notes ? <AppText>{data.notes}</AppText> : null}
          </>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="label" color="textSecondary">
          Ejercicios ({data.exercises.length})
        </AppText>
        {data.exercises.length === 0 ? (
          <AppText color="textSecondary">{editing ? 'Agrega tu primer ejercicio: solo necesitas escribir su nombre.' : 'Sin ejercicios registrados.'}</AppText>
        ) : null}
        {data.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            readOnly={!editing}
            suggestions={names.data ?? []}
            onSave={(patch) => saveExercise(exercise, patch)}
            onDelete={() => deleteExercise(exercise)}
          />
        ))}
        {editing ? (
          <Button
            title="Ejercicio"
            variant="secondary"
            icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
            loading={mutations.addExercise.isPending}
            onPress={() => mutations.addExercise.mutate({ workoutId: data.id, input: { name: '', sets: null, reps: null, weight: null, duration_minutes: null, notes: null } })}
          />
        ) : null}
      </View>

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <Button
          title="Duplicar en…"
          variant="secondary"
          icon={<Copy size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          onPress={() => setDuplicateOpen(true)}
        />
        {editing ? <Button title="Eliminar entrenamiento" variant="danger" icon={<Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />} onPress={deleteWorkout} /> : null}
        {editing ? <Button title="Listo" onPress={close} /> : null}
      </View>

      <DatePickerSheet
        visible={pickingDate}
        value={fromIso(data.performed_at)}
        onClose={() => setPickingDate(false)}
        onSelect={(date) => {
          const current = fromIso(data.performed_at);
          const next = new Date(date);
          next.setHours(current.getHours(), current.getMinutes(), 0, 0);
          mutations.update.mutate({ id: data.id, patch: { performed_at: toIso(next) } }, { onSuccess: markSaved });
          setPickingDate(false);
        }}
      />

      <DuplicateSheet
        visible={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        keepValues={keepValues}
        onKeepValuesChange={setKeepValues}
        onPick={(target) => {
          setDuplicateOpen(false);
          mutations.duplicate.mutate(
            { workoutId: data.id, target: { ...target, keepValues } },
            {
              onSuccess: (created) => {
                showSnackbar({ message: 'Entrenamiento duplicado.' });
                router.replace({ pathname: '/(app)/workout/[id]', params: { id: created.id } });
              },
            },
          );
        }}
      />
    </Screen>
  );
}

/** Elegir destino de duplicado: actividad de gym futura sin workout, o entrenamiento libre (RF-F8). */
function DuplicateSheet({
  visible,
  onClose,
  keepValues,
  onKeepValuesChange,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  keepValues: boolean;
  onKeepValuesChange: (v: boolean) => void;
  onPick: (target: { activityId: string | null; performedAt: string }) => void;
}) {
  const theme = useTheme();
  const range = useMemo(() => ({ from: startOfDay(new Date()), to: addDays(startOfDay(new Date()), 30) }), []);
  const activities = useActivitiesRange(range);
  const workouts = useWorkouts();
  const taken = new Set((workouts.data ?? []).map((w) => w.activity_id).filter(Boolean));
  const candidates = (activities.data ?? []).filter((a) => a.is_gym && !taken.has(a.id) && !a.owner_name);

  return (
    <Sheet visible={visible} onClose={onClose} title="Duplicar en…">
      <SwitchRow label="Conservar series, reps y peso" hint="Desactívalo para copiar solo la lista de ejercicios." value={keepValues} onValueChange={onKeepValuesChange} />
      <AppText variant="label" color="textSecondary">
        Próximas actividades de gimnasio
      </AppText>
      {candidates.length === 0 ? <AppText color="textSecondary">No hay actividades de gimnasio sin entrenamiento en los próximos 30 días.</AppText> : null}
      {candidates.map((a) => (
        <Button
          key={a.id}
          title={`${a.title} · ${formatShortDate(fromIso(a.start_at))} ${formatTime(fromIso(a.start_at))}`}
          variant="secondary"
          onPress={() => onPick({ activityId: a.id, performedAt: a.start_at })}
        />
      ))}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Button title="Entrenamiento libre (ahora)" onPress={() => onPick({ activityId: null, performedAt: new Date().toISOString() })} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  headerCard: { padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous', gap: Spacing.md },
  section: { gap: Spacing.md },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.lg, gap: Spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
});
