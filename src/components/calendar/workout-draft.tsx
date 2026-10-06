import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Copy, Dumbbell, Plus, Repeat2, Trash2, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type EditTarget, ExerciseBlock } from '@/components/fitness/exercise-block';
import { ExercisePicker } from '@/components/fitness/exercise-picker';
import { GlossarySheet } from '@/components/fitness/glossary-sheet';
import { NumpadSheet, type NumpadField } from '@/components/fitness/numpad-sheet';
import { applyNumpadValue, nextNumpadTarget, numpadFieldFor } from '@/components/fitness/set-editing';
import { ActionRow, AppText, Button, Chip, Sheet } from '@/components/ui';
import { SET_TYPES } from '@/constants/intensifiers';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { exerciseHistoryQuery } from '@/hooks/use-exercise-history';
import { useExercisePrefs, useExercises } from '@/hooks/use-exercises';
import { useTheme } from '@/hooks/use-theme';
import { setTypeDescription, setTypeLabel, workoutExerciseName } from '@/lib/gym/display-names';
import { uuidv4 } from '@/lib/gym/ids';
import { previousSets } from '@/lib/gym/session';
import { columnsFor, duplicateSet, newSet, nextSortOrder, removeSegment, sortOrderBetween } from '@/lib/gym/sets';
import { useAuth } from '@/providers';
import type { ExerciseHistoryEntry } from '@/services/workouts';
import { useGymStore } from '@/store/gym-store';
import type { Exercise, WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';
import { useLanguage, useT } from '@/i18n';

/**
 * Ejercicio en borrador: tiene la misma forma que uno de la sesión, con ids generados aquí,
 * pero todavía no existe en el backend porque la actividad tampoco. Al crear la actividad
 * se guardan tal cual (RF-F9).
 */
export type ExerciseDraft = WorkoutExerciseDetail;

const VACIOS = { prs: new Map(), pendientes: new Set<string>() };

export type WorkoutDraftProps = {
  exercises: ExerciseDraft[];
  onChange: (exercises: ExerciseDraft[]) => void;
  /** Cuando la actividad ya tiene entrenamiento guardado, aquí se ofrece abrirlo. */
  existingCount?: number;
  onOpenExisting?: () => void;
};

/**
 * Ejercicios del entrenamiento dentro del formulario de actividad (RF-F9). Usa los mismos
 * bloques que el logger (RF-F27): catálogo, teclado numérico, series prellenadas con la vez
 * pasada y arrastrar para reordenar. Si la actividad ya tiene entrenamiento, se ofrece
 * abrirlo en vez de duplicarlo.
 */
export function WorkoutDraft({ exercises, onChange, existingCount, onOpenExisting }: WorkoutDraftProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const d = tx.fitness.draft;
  const w = tx.fitness.workout;
  const router = useRouter();
  const { userId } = useAuth();
  const catalogo = useExercises();
  const prefs = useExercisePrefs();
  const unit = useGymStore((s) => s.weightUnit);
  const effortScale = useGymStore((s) => s.effortScale);
  const [selector, setSelector] = useState<{ modo: 'agregar' } | { modo: 'cambiar'; id: string } | null>(null);
  const [teclado, setTeclado] = useState<{ target: EditTarget; draft: WorkoutSet } | null>(null);
  const [menuSerie, setMenuSerie] = useState<{ exercise: ExerciseDraft; set: WorkoutSet } | null>(null);
  const [menuEjercicio, setMenuEjercicio] = useState<ExerciseDraft | null>(null);
  const [termino, setTermino] = useState<string | null>(null);

  const porId = useMemo(() => new Map((catalogo.data ?? []).map((e) => [e.id, e])), [catalogo.data]);
  const nombreDe = (e: { name: string; exercise_id?: string | null }) => workoutExerciseName(e.name, e.exercise_id ? porId.get(e.exercise_id) : null, lang);
  const notasFijas = useMemo(() => new Map((prefs.data ?? []).filter((p) => p.sticky_note).map((p) => [p.exercise_id, p.sticky_note as string])), [prefs.data]);

  // La vez pasada de cada ejercicio: llena la columna "Anterior" y la primera serie.
  const historiales = useQueries({ queries: exercises.map((e) => exerciseHistoryQuery(userId, { exerciseId: e.exercise_id ?? null, name: e.name })) });
  const anteriores = exercises.map((_, i) => ({
    sets: previousSets((historiales[i]?.data as ExerciseHistoryEntry[] | undefined) ?? [], ''),
    cargado: !!historiales[i]?.isSuccess,
  }));

  const cambiarEjercicio = (id: string, cambio: (e: ExerciseDraft) => ExerciseDraft) => onChange(exercises.map((e) => (e.id === id ? cambio(e) : e)));
  const guardarSerie = (set: WorkoutSet) =>
    onChange(
      exercises.map((e) =>
        e.id === set.workout_exercise_id
          ? { ...e, workout_sets: [...e.workout_sets.filter((s) => s.id !== set.id), set].sort((a, b) => a.sort_order - b.sort_order) }
          : e,
      ),
    );
  const quitarSerie = (set: WorkoutSet) => cambiarEjercicio(set.workout_exercise_id, (e) => ({ ...e, workout_sets: e.workout_sets.filter((s) => s.id !== set.id) }));

  /*
   * Un ejercicio recién agregado nace con su primera serie, prellenada con la vez pasada.
   * Se espera al historial para poder prellenarla, igual que en el logger.
   */
  const sembrados = useRef(new Set<string>());
  const firma = anteriores.map((a) => (a.cargado ? '1' : '0')).join('');
  useEffect(() => {
    const pendientes = exercises.filter((e, i) => anteriores[i]?.cargado && e.workout_sets.length === 0 && !sembrados.current.has(e.id));
    if (pendientes.length === 0) return;
    pendientes.forEach((e) => sembrados.current.add(e.id));
    onChange(
      exercises.map((e) => {
        if (!pendientes.includes(e)) return e;
        const previa = anteriores[exercises.indexOf(e)]?.sets[0] ?? null;
        return { ...e, workout_sets: [newSet(e.id, 1, previa, unit)] };
      }),
    );
    // Corre cuando cambia qué historiales ya llegaron, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, exercises.length]);

  const ejercicioDe = (set: WorkoutSet) => exercises.find((e) => e.id === set.workout_exercise_id) ?? null;
  const columnasDe = (e: ExerciseDraft) => {
    const cat = e.exercise_id ? porId.get(e.exercise_id) : undefined;
    return columnsFor(cat?.tracking_type ?? 'weight_reps', cat?.laterality === 'unilateral');
  };

  const campoTeclado: NumpadField | null = (() => {
    if (!teclado) return null;
    const ex = ejercicioDe(teclado.draft);
    const numero = (ex?.workout_sets.findIndex((s) => s.id === teclado.draft.id) ?? 0) + 1;
    return numpadFieldFor(teclado.target, teclado.draft, w.numpadTitle(ex ? nombreDe(ex) : w.setFallback, numero, null), effortScale, unit, lang);
  })();

  const elegir = (elegido: Exercise) => {
    if (!selector) return;
    if (selector.modo === 'cambiar') {
      cambiarEjercicio(selector.id, (e) => ({ ...e, name: elegido.name_es, exercise_id: elegido.id }));
      return;
    }
    const id = uuidv4();
    onChange([
      ...exercises,
      {
        id,
        workout_id: '',
        position: exercises.length,
        name: elegido.name_es,
        exercise_id: elegido.id,
        sets: null,
        reps: null,
        weight: null,
        duration_minutes: null,
        notes: null,
        workout_sets: [],
      },
    ]);
  };

  if (existingCount !== undefined && onOpenExisting) {
    return (
      <View style={[styles.container, { borderColor: theme.border }]}>
        <View style={styles.header}>
          <Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
          <AppText variant="label" color="textSecondary">
            {d.title}
          </AppText>
        </View>
        <AppText variant="caption" color="textTertiary">
          {existingCount === 0 ? d.existingEmpty : d.existingWith(existingCount)}
        </AppText>
        <Button title={d.openExisting} variant="secondary" onPress={onOpenExisting} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <Dumbbell size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />
        <AppText variant="label" color="textSecondary">
          {d.title}
        </AppText>
      </View>
      <AppText variant="caption" color="textTertiary">
        {d.intro}
      </AppText>

      {exercises.map((exercise, i) => {
        const cat = exercise.exercise_id ? porId.get(exercise.exercise_id) ?? null : null;
        const previas = anteriores[i]?.sets ?? [];
        return (
          <ExerciseBlock
            key={exercise.id}
            exercise={exercise}
            catalog={cat}
            columns={columnasDe(exercise)}
            previous={previas}
            prs={VACIOS.prs}
            pendientes={VACIOS.pendientes}
            unit={unit}
            effortScale={effortScale}
            editable
            legacyNote={null}
            groupLabel={null}
            protocolLabel={null}
            stickyNote={exercise.exercise_id ? notasFijas.get(exercise.exercise_id) ?? null : null}
            celebrate={false}
            onAddSet={(ex) => {
              const ultima = ex.workout_sets[ex.workout_sets.length - 1] ?? previas[ex.workout_sets.length] ?? null;
              guardarSerie(newSet(ex.id, nextSortOrder(ex.workout_sets), ultima, unit));
            }}
            onEdit={(target) => {
              const set = exercise.workout_sets.find((s) => s.id === target.setId);
              if (set) setTeclado({ target, draft: set });
            }}
            onToggle={(_ex, set) => guardarSerie({ ...set, completed_at: set.completed_at ? null : new Date().toISOString() })}
            onCopyPrevious={(set, previa) => {
              const f = previa.segments[0];
              if (f) guardarSerie({ ...set, segments: set.segments.map((g, j) => (j === 0 ? { ...g, weight_kg: f.weight_kg, input_unit: f.input_unit, reps: f.reps, reps_left: f.reps_left, reps_right: f.reps_right, duration_sec: f.duration_sec, distance_m: f.distance_m } : g)) });
            }}
            onSetMenu={(ex, set) => setMenuSerie({ exercise: ex, set })}
            onDuplicate={(ex, set) => {
              const j = ex.workout_sets.findIndex((s) => s.id === set.id);
              guardarSerie(duplicateSet(set, sortOrderBetween(set.sort_order, ex.workout_sets[j + 1]?.sort_order ?? null)));
            }}
            onDelete={(_ex, set) => quitarSerie(set)}
            onRemoveSegment={(set, j) => guardarSerie(removeSegment(set, j))}
            onMoveSet={(ex, from, to) => {
              const resto = ex.workout_sets.filter((_, j) => j !== from);
              const set = ex.workout_sets[from];
              if (set) guardarSerie({ ...set, sort_order: sortOrderBetween(resto[to - 1]?.sort_order ?? null, resto[to]?.sort_order ?? null) });
            }}
            onExerciseMenu={setMenuEjercicio}
            onExplain={setTermino}
            onOpenDetail={(ex) => {
              if (ex.exercise_id) router.push({ pathname: '/(app)/exercise/[id]', params: { id: ex.exercise_id } });
            }}
          />
        );
      })}

      <Button
        title={exercises.length === 0 ? d.addExercise : d.addAnother}
        variant="secondary"
        icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
        onPress={() => setSelector({ modo: 'agregar' })}
      />

      <GlossarySheet termId={termino} onClose={() => setTermino(null)} />

      <ExercisePicker visible={selector !== null} onClose={() => setSelector(null)} onPick={elegir} />

      <NumpadSheet
        visible={teclado !== null}
        field={campoTeclado}
        onChange={(valor) => teclado && setTeclado({ target: teclado.target, draft: applyNumpadValue(teclado.draft, teclado.target, valor, effortScale, unit) })}
        onClose={() => {
          if (teclado) guardarSerie(teclado.draft);
          setTeclado(null);
        }}
        onNext={() => {
          if (!teclado) return;
          guardarSerie(teclado.draft);
          const ex = ejercicioDe(teclado.draft);
          const proximo = ex ? nextNumpadTarget(teclado.target, columnasDe(ex)) : null;
          setTeclado(proximo ? { target: proximo, draft: teclado.draft } : null);
        }}
      />

      <Sheet visible={menuSerie !== null} onClose={() => setMenuSerie(null)} title={w.setSheet}>
        {menuSerie ? (
          <>
            <AppText variant="label" color="textSecondary">
              {w.setType}
            </AppText>
            <View style={styles.chips}>
              {SET_TYPES.filter((t) => ['warmup', 'working', 'top_set', 'backoff', 'failure', 'amrap'].includes(t.value)).map((t) => (
                <Chip
                  key={t.value}
                  compact
                  label={setTypeLabel(t.value, lang)}
                  selected={menuSerie.set.set_type === t.value}
                  onPress={() => {
                    // La hoja sigue abierta: así se lee qué significa cada tipo antes de cerrar.
                    const nueva = { ...menuSerie.set, set_type: t.value };
                    guardarSerie(nueva);
                    setMenuSerie({ ...menuSerie, set: nueva });
                  }}
                />
              ))}
            </View>
            <AppText variant="caption" color="textTertiary">
              {setTypeDescription(menuSerie.set.set_type, lang)}
            </AppText>
            <ActionRow
              icon={<Copy size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.duplicate}
              onPress={() => {
                const sets = menuSerie.exercise.workout_sets;
                const j = sets.findIndex((s) => s.id === menuSerie.set.id);
                guardarSerie(duplicateSet(menuSerie.set, sortOrderBetween(menuSerie.set.sort_order, sets[j + 1]?.sort_order ?? null)));
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label={w.deleteSet}
              color="danger"
              onPress={() => {
                quitarSerie(menuSerie.set);
                setMenuSerie(null);
              }}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={menuEjercicio !== null} onClose={() => setMenuEjercicio(null)} title={menuEjercicio ? nombreDe(menuEjercicio) : w.exerciseFallback}>
        {menuEjercicio ? (
          <>
            <ActionRow
              icon={<Repeat2 size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.changeExercise}
              onPress={() => {
                setSelector({ modo: 'cambiar', id: menuEjercicio.id });
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<X size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label={w.removeExercise}
              color="danger"
              onPress={() => {
                onChange(exercises.filter((e) => e.id !== menuEjercicio.id).map((e, j) => ({ ...e, position: j })));
                setMenuEjercicio(null);
              }}
            />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, padding: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
});
