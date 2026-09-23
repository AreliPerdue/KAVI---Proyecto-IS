import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutMutations, useWorkouts } from '@/hooks/use-workouts';
import { formatShortDate, formatTime, fromIso } from '@/lib/dates';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Workout } from '@/types/domain';

/** Nombre propio > título de la actividad ligada > texto de reserva (RF-F7). */
function nombreDe(workout: Workout): string {
  return workout.title || workout.activity_title || 'Entrenamiento libre';
}

/** Historial de entrenamientos + entrenamiento libre (RF-F2, RF-F7). */
export default function FitnessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const workouts = useWorkouts();
  const { create } = useWorkoutMutations();
  const lastWorkoutTitle = usePreferencesStore((s) => s.lastWorkoutTitle);

  const openWorkout = useCallback(
    (id: string, mode: 'view' | 'edit') => router.push({ pathname: '/(app)/workout/[id]', params: { id, mode } }),
    [router],
  );

  /**
   * Se estrena con el nombre del entrenamiento anterior: quien entrena repite
   * rutina, y así solo hay que cambiarlo cuando de verdad cambia (RF-F7).
   */
  const startFree = () =>
    create.mutate(
      { activity_id: null, title: lastWorkoutTitle, performed_at: new Date().toISOString() },
      { onSuccess: (w) => openWorkout(w.id, 'edit') },
    );

  const renderItem = useCallback(
    ({ item }: { item: Workout }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${nombreDe(item)}, ${formatShortDate(fromIso(item.performed_at))}, ${item.exercise_count ?? 0} ejercicios`}
        onPress={() => openWorkout(item.id, 'view')}
        style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyStrong">{nombreDe(item)}</AppText>
          <AppText variant="caption" color="textSecondary" tabular>
            {formatShortDate(fromIso(item.performed_at))} · {formatTime(fromIso(item.performed_at))} · {item.exercise_count ?? 0}{' '}
            {item.exercise_count === 1 ? 'ejercicio' : 'ejercicios'}
            {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
          </AppText>
        </View>
        <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      </Pressable>
    ),
    [theme, openWorkout],
  );

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          Fitness
        </AppText>
        <Button
          title="Entrenamiento libre"
          variant="secondary"
          icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
          loading={create.isPending}
          onPress={startFree}
        />
        <AppText variant="caption" color="textTertiary">
          Para registrar una sesión agendada, ábrela en el calendario y toca “Registrar entrenamiento”.
        </AppText>
      </View>
      {workouts.isPending ? <LoadingState /> : null}
      {workouts.isError ? <ErrorState message={workouts.error.message} onRetry={() => workouts.refetch()} /> : null}
      {workouts.isSuccess ? (
        <FlatList
          data={workouts.data}
          keyExtractor={(w) => w.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon={<Dumbbell size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
              title="Aún no registras entrenamientos"
              description="Tu historial aparecerá aquí, ligado a tus actividades de gimnasio."
            />
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  header: { gap: Spacing.sm },
  list: { gap: Spacing.sm, paddingBottom: Spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  icon: { width: 40, height: 40, borderRadius: Radius.sm, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
