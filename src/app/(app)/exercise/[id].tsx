import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pin } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NoteSheet } from '@/components/fitness/note-sheet';
import { ProgressChart } from '@/components/fitness/progress-chart';
import { ModalHeader } from '@/components/modal-header';
import { AppText, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { EQUIPMENT, MUSCLES } from '@/constants/exercise-catalog';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useExerciseHistory } from '@/hooks/use-exercise-history';
import { useExerciseMutations, useExercisePrefs, useExercises } from '@/hooks/use-exercises';
import { useTheme } from '@/hooks/use-theme';
import { e1rm as estimar } from '@/lib/gym/e1rm';
import { formatSet } from '@/lib/gym/sets';
import { formatWeight, fromKg, round } from '@/lib/gym/units';
import { segmentLoadKg, segmentReps, setVolume } from '@/lib/gym/volume';
import { useGymStore } from '@/store/gym-store';
import type { WorkoutSet } from '@/types/domain';

const MAX_WIDTH = 640;

type MejorSerie = { set: WorkoutSet; e1rm: number; fecha: string };

/**
 * Detalle de un ejercicio (RF-F26): mejor serie, récords, tendencia de e1RM y de volumen,
 * y las sesiones en que se hizo. Todo se calcula del historial; no hay nada guardado aparte
 * que pueda quedarse viejo al editar una sesión.
 */
export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalogo = useExercises();
  const exercise = useMemo(() => (catalogo.data ?? []).find((e) => e.id === id) ?? null, [catalogo.data, id]);
  const history = useExerciseHistory(exercise ? { exerciseId: exercise.id, name: exercise.name_es } : null);
  const unit = useGymStore((s) => s.weightUnit);
  const formula = useGymStore((s) => s.e1rmFormula);
  const prefs = useExercisePrefs();
  const { saveStickyNote } = useExerciseMutations();
  const [editandoNota, setEditandoNota] = useState(false);
  const notaFija = (prefs.data ?? []).find((p) => p.exercise_id === id)?.sticky_note ?? null;

  const analisis = useMemo(() => {
    if (!exercise || !history.data) return null;
    const tracking = exercise.tracking_type;
    const cuenta = (s: WorkoutSet) => s.completed_at !== null && s.set_type !== 'warmup';
    let mejor = null as MejorSerie | null;
    let pesoMax = 0;
    const sesiones = [...history.data].reverse().flatMap((h) => {
      const ctx = { trackingType: tracking, bodyweightKg: h.bodyweight_kg };
      const hechas = h.sets.filter(cuenta);
      if (hechas.length === 0) return [];
      let mejorE1rm = 0;
      for (const s of hechas) {
        for (const g of s.segments) {
          const carga = segmentLoadKg(g, ctx);
          const reps = segmentReps(g);
          if (carga === null || reps < 1) continue;
          pesoMax = Math.max(pesoMax, carga);
          const est = reps <= 12 ? estimar(carga, reps, formula) ?? 0 : 0;
          if (est > mejorE1rm) mejorE1rm = est;
          if (!mejor || est > mejor.e1rm) mejor = { set: s, e1rm: est, fecha: h.performed_at };
        }
      }
      return [{ fecha: h.performed_at, e1rm: mejorE1rm, volumen: hechas.reduce((t, s) => t + setVolume(s, ctx), 0), sets: hechas, workoutId: h.workout_id }];
    });
    return { sesiones, mejor: mejor as MejorSerie | null, pesoMax };
  }, [exercise, history.data, formula]);

  const enUnidad = (kg: number) => round(fromKg(kg, unit), unit === 'kg' ? 1 : 0);
  const fecha = (iso: string) => format(new Date(iso), 'd MMM', { locale: es });

  if (catalogo.isPending || (exercise && history.isPending)) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader back title="Ejercicio" />
        <LoadingState />
      </Screen>
    );
  }
  if (!exercise) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader back title="Ejercicio" />
        <ErrorState message="Ese ejercicio no está en tu catálogo." onRetry={() => catalogo.refetch()} />
      </Screen>
    );
  }

  const musculos = exercise.primary_muscles.map((m) => (MUSCLES as Record<string, string>)[m] ?? m).join(', ');
  const equipo = exercise.equipment.map((q) => (EQUIPMENT as Record<string, string>)[q] ?? q).join(', ');
  const sesiones = analisis?.sesiones ?? [];
  const conE1rm = sesiones.filter((s) => s.e1rm > 0);

  return (
    <Screen modal scroll maxWidth={MAX_WIDTH}>
      <ModalHeader back title="Ejercicio" />
      <View style={styles.cabecera}>
        <AppText variant="title">{exercise.name_es}</AppText>
        <AppText color="textSecondary">{[musculos, equipo].filter(Boolean).join(' · ')}</AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={notaFija ? `Nota fija: ${notaFija}. Toca para editarla` : 'Agregar nota fija'}
        onPress={() => setEditandoNota(true)}
        style={({ pressed }) => [styles.nota, { backgroundColor: pressed ? theme.border : theme.surfaceAlt }]}>
        <Pin size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <View style={styles.flex}>
          <AppText variant="caption" color="textSecondary">
            Nota fija
          </AppText>
          <AppText color={notaFija ? 'text' : 'textTertiary'}>{notaFija ?? 'Ajustes de la máquina, agarre, lo que siempre olvidas…'}</AppText>
        </View>
      </Pressable>

      {sesiones.length === 0 ? (
        <EmptyState title="Todavía sin series" description="Cuando registres este ejercicio, aquí verás tu mejor serie y cómo vas." />
      ) : (
        <>
          <View style={styles.cifras}>
            <View style={[styles.cifra, { backgroundColor: theme.surfaceAlt }]}>
              <AppText variant="caption" color="textSecondary">
                Mejor serie
              </AppText>
              <AppText variant="bodyStrong" tabular>
                {analisis?.mejor ? formatSet(analisis.mejor.set, unit) : '—'}
              </AppText>
              {analisis?.mejor && analisis.mejor.e1rm > 0 ? (
                <AppText variant="caption" color="textTertiary" tabular>
                  e1RM {enUnidad(analisis.mejor.e1rm)} {unit} · {fecha(analisis.mejor.fecha)}
                </AppText>
              ) : null}
            </View>
            <View style={[styles.cifra, { backgroundColor: theme.surfaceAlt }]}>
              <AppText variant="caption" color="textSecondary">
                Peso máximo
              </AppText>
              <AppText variant="bodyStrong" tabular>
                {analisis && analisis.pesoMax > 0 ? formatWeight(analisis.pesoMax, unit) : '—'}
              </AppText>
              <AppText variant="caption" color="textTertiary">
                {sesiones.length} {sesiones.length === 1 ? 'sesión' : 'sesiones'}
              </AppText>
            </View>
          </View>

          {conE1rm.length > 0 ? (
            <ProgressChart
              title="e1RM por sesión"
              points={conE1rm.map((s) => ({ label: fecha(s.fecha), value: enUnidad(s.e1rm) }))}
              format={(v) => `${v} ${unit}`}
            />
          ) : null}
          <ProgressChart
            title="Volumen por sesión"
            points={sesiones.map((s) => ({ label: fecha(s.fecha), value: enUnidad(s.volumen) }))}
            format={(v) => `${Math.round(v).toLocaleString('es-MX')} ${unit}`}
          />

          <View style={styles.lista}>
            <AppText variant="label" color="textSecondary">
              Sesiones
            </AppText>
            {[...sesiones].reverse().map((s) => (
              <Pressable
                key={s.workoutId}
                accessibilityRole="button"
                accessibilityLabel={`Abrir la sesión del ${fecha(s.fecha)}`}
                onPress={() => router.push({ pathname: '/(app)/workout/[id]', params: { id: s.workoutId, mode: 'view' } })}
                style={({ pressed }) => [styles.sesion, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
                <AppText variant="bodyStrong">{fecha(s.fecha)}</AppText>
                {s.sets.map((set) => (
                  <AppText key={set.id} variant="caption" color="textSecondary" tabular>
                    {formatSet(set, unit)}
                  </AppText>
                ))}
              </Pressable>
            ))}
          </View>
        </>
      )}
      <NoteSheet
        visible={editandoNota}
        title="Nota fija"
        hint={`Se verá arriba de ${exercise.name_es} en cada sesión.`}
        placeholder="Asiento en 4, respaldo en 2"
        initialText={notaFija}
        onClose={() => setEditandoNota(false)}
        onSave={(texto) => saveStickyNote.mutate({ exerciseId: exercise.id, note: texto })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cabecera: { gap: Spacing.xs },
  nota: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 52, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous' },
  flex: { flex: 1, gap: 2 },
  cifras: { flexDirection: 'row', gap: Spacing.sm },
  cifra: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
  lista: { gap: Spacing.sm },
  sesion: { padding: Spacing.md, borderWidth: 1, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
});
