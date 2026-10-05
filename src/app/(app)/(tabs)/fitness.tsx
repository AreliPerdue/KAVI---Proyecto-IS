import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight, Dumbbell, MessageSquareText, Play, Plus, Search, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextStyle, View } from 'react-native';

import { ActivityView } from '@/components/fitness/activity-view';
import { StreakCard } from '@/components/fitness/streak-card';
import { AppText, Button, EmptyState, ErrorState, IconButton, LoadingState, Screen, Segmented } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLegacyConversion } from '@/hooks/use-exercise-history';
import { useOutboxBootstrap } from '@/hooks/use-set-sync';
import { useExternalSessions, useHealthAvailability, useHealthPermissions } from '@/hooks/use-health';
import { useNoteSearch, useWorkoutMutations, useWorkouts } from '@/hooks/use-workouts';
import { kaviSpan, matchSessions } from '@/lib/health/match';
import { HEALTH_SOURCE_LABEL } from '@/services/health';
import { formatShortDate, formatTime, fromIso } from '@/lib/dates';
import type { NoteHit } from '@/services/workouts';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Workout } from '@/types/domain';
import { StackedModuleBack } from '@/components/navigation/stacked-module';

const SIN_ANILLO: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

const DONDE: Record<NoteHit['where'], string> = { session: 'Nota de la sesión', exercise: 'Nota del ejercicio', set: 'Nota de serie' };

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
  const [busqueda, setBusqueda] = useState('');
  const [parte, setParte] = useState<'ejercicio' | 'actividad'>('ejercicio');
  // RF-H6: una sesión del reloj que coincide con una de KAVI le aporta sus calorías activas.
  const salud = useHealthAvailability();
  const permisosSalud = useHealthPermissions(salud.data?.status === 'available');
  const externas = useExternalSessions(30, !!permisosSalud.data?.exercise_sessions);
  const delReloj = useMemo(() => matchSessions((workouts.data ?? []).map(kaviSpan), externas.data ?? []).byKavi, [workouts.data, externas.data]);
  const notas = useNoteSearch(busqueda);
  const buscando = busqueda.trim().length >= 2;
  // Al entrar a Fitness se recupera lo que quedó sin enviar y se convierte lo de v1.
  useOutboxBootstrap();
  useLegacyConversion();
  /** La sesión que se quedó abierta: se ofrece retomarla antes que empezar otra. */
  const enCurso = (workouts.data ?? []).find((w) => w.status === 'active') ?? null;

  const openWorkout = useCallback(
    (id: string, mode: 'view' | 'edit') => router.push({ pathname: '/(app)/workout/[id]', params: { id, mode } }),
    [router],
  );

  /**
   * Entrenamiento libre (RF-F2, RF-F7).
   *
   * No crea actividad: el calendario lo pinta como capa derivada, que se puede
   * ocultar desde Perfil y que alcanza también a los entrenamientos registrados
   * antes de existir esa vista (RF-F10).
   *
   * Se estrena con el nombre del anterior: quien entrena repite rutina, y así solo
   * hay que cambiarlo cuando de verdad cambia.
   */
  const startFree = () =>
    create.mutate(
      { activity_id: null, title: lastWorkoutTitle, performed_at: new Date().toISOString(), status: 'active' },
      { onSuccess: (w) => openWorkout(w.id, 'edit') },
    );

  const renderItem = useCallback(
    ({ item }: { item: Workout }) => {
      const reloj = delReloj.get(item.id);
      return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${nombreDe(item)}, ${formatShortDate(fromIso(item.performed_at))}, ${item.exercise_count ?? 0} ejercicios`}
        onPress={() => openWorkout(item.id, 'view')}
        style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.text}>
          <View style={styles.tituloFila}>
            <AppText variant="bodyStrong" style={styles.flexTexto}>
              {nombreDe(item)}
            </AppText>
            {item.notes ? <MessageSquareText size={14} strokeWidth={IconStroke} color={theme.textTertiary} accessibilityLabel="Tiene nota" /> : null}
          </View>
          <AppText variant="caption" color="textSecondary" tabular>
            {formatShortDate(fromIso(item.performed_at))} · {formatTime(fromIso(item.performed_at))} · {item.exercise_count ?? 0}{' '}
            {item.exercise_count === 1 ? 'ejercicio' : 'ejercicios'}
            {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
            {item.edited_at ? ' · editado' : ''}
          </AppText>
          {reloj?.activeKcal != null ? (
            <AppText variant="caption" color="textTertiary" tabular>
              {Math.round(reloj.activeKcal)} kcal activas · {reloj.app ?? HEALTH_SOURCE_LABEL[reloj.source]}
            </AppText>
          ) : null}
        </View>
        <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      </Pressable>
      );
    },
    [theme, openWorkout, delReloj],
  );

  const renderNota = useCallback(
    ({ item }: { item: NoteHit }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${DONDE[item.where]}, ${formatShortDate(fromIso(item.performed_at))}: ${item.text}`}
        onPress={() => openWorkout(item.workout_id, 'view')}
        style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <MessageSquareText size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.text}>
          <AppText variant="caption" color="textSecondary" tabular>
            {formatShortDate(fromIso(item.performed_at))} · {item.title || DONDE[item.where]}
            {item.exercise_name ? ` · ${item.exercise_name}` : ''}
          </AppText>
          <AppText numberOfLines={3}>{item.text}</AppText>
        </View>
        <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      </Pressable>
    ),
    [theme, openWorkout],
  );

  return (
    <Screen contentStyle={styles.content}>
      <StackedModuleBack />
      <View style={styles.header}>
        <AppText variant="title" accessibilityRole="header">
          Fitness
        </AppText>
        {/* Spec 11: Ejercicio es el Gym Tracker de siempre; Actividad, lo que mide el teléfono. */}
        <Segmented
          fullWidth
          options={[{ value: 'ejercicio', label: 'Ejercicio' }, { value: 'actividad', label: 'Actividad' }]}
          value={parte}
          onChange={setParte}
        />
      </View>
      {parte === 'actividad' ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <ActivityView />
        </ScrollView>
      ) : (
        <>
          <View style={styles.header}>
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
            {/* RF-F64: entrenar no exige saber jerga; el glosario está a un toque. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Glosario: qué significa cada término del gimnasio"
              onPress={() => router.push('/(app)/glossary')}
              style={({ pressed }) => [styles.glosario, pressed ? { opacity: 0.75 } : null]}>
              <BookOpen size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
              <AppText variant="label" color="textSecondary">
                ¿Qué es RIR, un drop set o una superserie? Ver el glosario
              </AppText>
            </Pressable>
            {enCurso ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Continuar la sesión en curso: ${nombreDe(enCurso)}`}
                onPress={() => openWorkout(enCurso.id, 'edit')}
                style={({ pressed }) => [styles.enCurso, { backgroundColor: theme.ink }, pressed ? { opacity: 0.85 } : null]}>
                <Play size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} fill={theme.onInk} />
                <View style={styles.text}>
                  <AppText variant="bodyStrong" color="onInk">
                    Sesión en curso
                  </AppText>
                  <AppText variant="caption" color="onInk">
                    {nombreDe(enCurso)} · desde las {formatTime(fromIso(enCurso.performed_at))}
                  </AppText>
                </View>
                <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />
              </Pressable>
            ) : null}
            <StreakCard />
          </View>
          <View style={[styles.buscador, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
            <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar en tus notas"
              placeholderTextColor={theme.textTertiary}
              accessibilityLabel="Buscar en tus notas"
              autoCorrect={false}
              returnKeyType="search"
              style={[styles.input, SIN_ANILLO, { color: theme.text }]}
            />
            {busqueda ? (
              <IconButton label="Limpiar búsqueda" onPress={() => setBusqueda('')}>
                <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
              </IconButton>
            ) : null}
          </View>
          {buscando ? (
            notas.isError ? (
              <ErrorState message={notas.error.message} onRetry={() => notas.refetch()} />
            ) : notas.data === undefined ? (
              <LoadingState />
            ) : (
              <FlatList
                data={notas.data}
                keyExtractor={(n, i) => `${n.workout_id}:${n.where}:${i}`}
                renderItem={renderNota}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <EmptyState
                    icon={<MessageSquareText size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
                    title="Ninguna nota dice eso"
                    description="Busca en las notas de tus sesiones, ejercicios y series."
                  />
                }
              />
            )
          ) : null}
          {!buscando && workouts.isPending ? <LoadingState /> : null}
          {!buscando && workouts.isError ? <ErrorState message={workouts.error.message} onRetry={() => workouts.refetch()} /> : null}
          {!buscando && workouts.isSuccess ? (
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
        </>
      )}
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
  glosario: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flexTexto: { flexShrink: 1 },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingLeft: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm },
  enCurso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 64, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
});
