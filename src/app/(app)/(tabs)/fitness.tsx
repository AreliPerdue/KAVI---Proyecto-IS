import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, MessageSquareText, Search, Settings, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, type TextStyle, useWindowDimensions, View } from 'react-native';

import { ActivityView } from '@/components/fitness/activity-view';
import { FitnessBento } from '@/components/fitness/fitness-bento';
import { AppText, EmptyState, ErrorState, IconButton, LoadingState, Screen, Segmented } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLegacyConversion } from '@/hooks/use-exercise-history';
import { useOutboxBootstrap } from '@/hooks/use-set-sync';
import { useExternalSessions, useHealthAvailability, useHealthPermissions } from '@/hooks/use-health';
import { useNoteSearch, useWorkoutMutations, useWorkouts } from '@/hooks/use-workouts';
import { kaviSpan, matchSessions } from '@/lib/health/match';
import { formatShortDate, formatTime, fromIso } from '@/lib/dates';
import type { NoteHit } from '@/services/workouts';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Workout } from '@/types/domain';
import { StackedModuleBack } from '@/components/navigation/stacked-module';
import { type Dictionary, useLanguage, useT } from '@/i18n';

const SIN_ANILLO: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle) : {};

type Fila = { tipo: 'sesion'; clave: string; sesion: Workout } | { tipo: 'nota'; clave: string; nota: NoteHit };

/** Nombre propio > título de la actividad ligada > texto de reserva (RF-F7). */
function nombreDe(workout: Workout, tx: Dictionary): string {
  return workout.title || workout.activity_title || tx.fitness.tab.freeWorkout;
}

/** Historial de entrenamientos + entrenamiento libre (RF-F2, RF-F7). */
export default function FitnessScreen() {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const f = tx.fitness.tab;
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
  // RF-F66: 2 columnas en celular, 4 en ancho y, desde 1024 px, mosaico e historial lado a lado.
  const { width } = useWindowDimensions();
  const ladoALado = width >= 1024;
  const columnas = width >= 720 && !ladoALado ? 4 : 2;
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
   * ocultar desde Perfil (es un ajuste del calendario) y que alcanza también a los entrenamientos registrados
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
        accessibilityLabel={`${nombreDe(item, tx)}, ${formatShortDate(fromIso(item.performed_at), lang)}, ${f.exercisesCount(item.exercise_count ?? 0)}`}
        onPress={() => openWorkout(item.id, 'view')}
        style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.text}>
          <View style={styles.tituloFila}>
            <AppText variant="bodyStrong" style={styles.flexTexto}>
              {nombreDe(item, tx)}
            </AppText>
            {item.notes ? <MessageSquareText size={14} strokeWidth={IconStroke} color={theme.textTertiary} accessibilityLabel={f.hasNote} /> : null}
          </View>
          <AppText variant="caption" color="textSecondary" tabular>
            {formatShortDate(fromIso(item.performed_at), lang)} · {formatTime(fromIso(item.performed_at), lang)} · {f.exercisesCount(item.exercise_count ?? 0)}
            {item.duration_minutes ? ` · ${item.duration_minutes} min` : ''}
            {item.edited_at ? ` · ${f.edited}` : ''}
          </AppText>
          {reloj?.activeKcal != null ? (
            <AppText variant="caption" color="textTertiary" tabular>
              {f.activeKcal(Math.round(reloj.activeKcal), reloj.app ?? tx.fitness.health.sources[reloj.source])}
            </AppText>
          ) : null}
        </View>
        <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      </Pressable>
      );
    },
    [theme, openWorkout, delReloj, tx, lang, f],
  );

  const renderNota = useCallback(
    ({ item }: { item: NoteHit }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${f.where[item.where]}, ${formatShortDate(fromIso(item.performed_at), lang)}: ${item.text}`}
        onPress={() => openWorkout(item.workout_id, 'view')}
        style={({ pressed }) => [styles.row, { borderColor: theme.border, backgroundColor: pressed ? theme.surfaceAlt : theme.surface }]}>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <MessageSquareText size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
        </View>
        <View style={styles.text}>
          <AppText variant="caption" color="textSecondary" tabular>
            {formatShortDate(fromIso(item.performed_at), lang)} · {item.title || f.where[item.where]}
            {item.exercise_name ? ` · ${item.exercise_name}` : ''}
          </AppText>
          <AppText numberOfLines={3}>{item.text}</AppText>
        </View>
        <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      </Pressable>
    ),
    [theme, openWorkout, lang, f],
  );

  const buscador = (
    <View style={[styles.buscador, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
      <Search size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder={f.searchNotes}
        placeholderTextColor={theme.textTertiary}
        accessibilityLabel={f.searchNotes}
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, SIN_ANILLO, { color: theme.text }]}
      />
      {busqueda ? (
        <IconButton label={tx.fitness.picker.clearSearch} onPress={() => setBusqueda('')}>
          <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
        </IconButton>
      ) : null}
    </View>
  );

  const bento = (
    <View style={styles.header}>
      <FitnessBento
        columns={columnas}
        inProgress={enCurso ? { name: nombreDe(enCurso, tx), since: formatTime(fromIso(enCurso.performed_at), lang) } : null}
        starting={create.isPending}
        onStart={startFree}
        onContinue={() => enCurso && openWorkout(enCurso.id, 'edit')}
      />
      <AppText variant="caption" color="textTertiary">
        {f.scheduledHint}
      </AppText>
    </View>
  );

  /*
   * Una sola lista para el historial y las notas encontradas: con dos, al pasar de una a otra se
   * desmontaba el encabezado y el buscador perdía el foco a media palabra.
   */
  const filas: Fila[] = buscando
    ? (notas.data ?? []).map((n, i) => ({ tipo: 'nota', clave: `${n.workout_id}:${n.where}:${i}`, nota: n }))
    : (workouts.data ?? []).map((w) => ({ tipo: 'sesion', clave: w.id, sesion: w }));

  const vacio = buscando ? (
    notas.isError ? (
      <ErrorState message={notas.error.message} onRetry={() => notas.refetch()} />
    ) : notas.data === undefined ? (
      <LoadingState />
    ) : (
      <EmptyState
        icon={<MessageSquareText size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
        title={f.noNotesTitle}
        description={f.noNotesDescription}
      />
    )
  ) : workouts.isError ? (
    <ErrorState message={workouts.error.message} onRetry={() => workouts.refetch()} />
  ) : workouts.isPending ? (
    <LoadingState />
  ) : (
    <EmptyState
      icon={<Dumbbell size={32} strokeWidth={IconStroke} color={theme.textTertiary} />}
      title={f.emptyTitle}
      description={f.emptyDescription}
    />
  );

  const historial = (
    <FlatList
      data={filas}
      keyExtractor={(x) => x.clave}
      renderItem={({ item }) => (item.tipo === 'nota' ? renderNota({ item: item.nota }) : renderItem({ item: item.sesion }))}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          {ladoALado ? null : bento}
          {buscador}
          {buscando || filas.length === 0 ? null : (
            <AppText variant="label" color="textSecondary" accessibilityRole="header">
              {tx.fitness.bento.history}
            </AppText>
          )}
        </View>
      }
      ListEmptyComponent={vacio}
    />
  );

  return (
    <Screen contentStyle={styles.content}>
      <StackedModuleBack />
      <View style={styles.header}>
        <View style={styles.tituloPantalla}>
          <AppText variant="title" accessibilityRole="header" style={styles.flexTexto}>
            {f.title}
          </AppText>
          {/* RF-F67: los ajustes del gym viven aquí y no en Perfil. */}
          <IconButton label={tx.fitness.settings.openA11y} onPress={() => router.push('/(app)/fitness-settings')}>
            <Settings size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        </View>
        {/* Spec 11: Ejercicio es el Gym Tracker de siempre; Actividad, lo que mide el teléfono. */}
        <Segmented
          fullWidth
          options={[{ value: 'ejercicio', label: f.exercise }, { value: 'actividad', label: f.activity }]}
          value={parte}
          onChange={setParte}
        />
      </View>
      {parte === 'actividad' ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <ActivityView />
        </ScrollView>
      ) : ladoALado ? (
        // Desde 1024 px el mosaico y el historial van lado a lado (RF-F66).
        <View style={styles.ladoALado}>
          <ScrollView style={styles.columna} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {bento}
          </ScrollView>
          <View style={styles.columna}>{historial}</View>
        </View>
      ) : (
        historial
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
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  tituloPantalla: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  flexTexto: { flexShrink: 1 },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingLeft: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous' },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm },
  ladoALado: { flex: 1, flexDirection: 'row', gap: Spacing.xl },
  columna: { flex: 1 },
});
