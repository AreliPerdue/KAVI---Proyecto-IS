import { useQueries, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, CalendarDays, Clock, Copy, GripVertical, Link2, ListOrdered, Merge, MessageSquareText, Pencil, Pin, Plus, Redo2, Repeat2, Scale, Scissors, SlidersHorizontal, Sparkles, Timer, Trash2, Undo2, Unlink, Wrench, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type EditTarget, ExerciseBlock } from '@/components/fitness/exercise-block';
import { ExercisePicker } from '@/components/fitness/exercise-picker';
import { GlossarySheet } from '@/components/fitness/glossary-sheet';
import { GroupSheet } from '@/components/fitness/group-sheet';
import { IntensifierSheet } from '@/components/fitness/intensifier-sheet';
import { IntervalTimerSheet } from '@/components/fitness/interval-timer-sheet';
import { SessionSummarySheet } from '@/components/fitness/session-summary';
import { applyNumpadValue, nextNumpadTarget, numpadFieldFor } from '@/components/fitness/set-editing';
import { SetDetailsSheet } from '@/components/fitness/set-details-sheet';
import { VariantSheet } from '@/components/fitness/variant-sheet';
import { NoteSheet } from '@/components/fitness/note-sheet';
import { ReorderExercisesSheet } from '@/components/fitness/reorder-exercises-sheet';
import { NumpadSheet, type NumpadField } from '@/components/fitness/numpad-sheet';
import { RestTimerBar } from '@/components/fitness/rest-timer-bar';
import { ToolsSheet } from '@/components/fitness/tools-sheet';
import { ModalHeader } from '@/components/modal-header';
import { ActionRow, AppText, Banner, Button, Chip, DatePickerSheet, ErrorState, FieldButton, IconButton, LoadingState, Screen, Sheet, SwitchRow, TextField, TimePickerSheet } from '@/components/ui';
import { SESSION_TAGS, SET_TAGS } from '@/constants/gym-notes';
import { gymratLine } from '@/constants/gymrat';
import { PROTOCOLS, SET_TYPES, type ProtocolKey } from '@/constants/intensifiers';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivitiesRange } from '@/hooks/use-activities-range';
import { useEditHistory } from '@/hooks/use-edit-history';
import { exerciseHistoryQuery, useLegacyConversion } from '@/hooks/use-exercise-history';
import { useExerciseMutations, useExercisePrefs, useExercises } from '@/hooks/use-exercises';
import { useSessionDetail, useSetActions } from '@/hooks/use-set-sync';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutMutations, useWorkouts, workoutKeys } from '@/hooks/use-workouts';
import { formatDate, formatShortDate, formatTime, fromIso, startOfDay, toIso } from '@/lib/dates';
import { success, tap } from '@/lib/haptics';
import { exerciseName, protocolLabel, setTypeDescription, setTypeLabel, tagLabel, workoutExerciseName } from '@/lib/gym/display-names';
import { hasLegacyText, parseLegacy } from '@/lib/gym/legacy';
import type { PrKind } from '@/lib/gym/records';
import { previousSets, sessionPRs, sessionSummary } from '@/lib/gym/session';
import {
  addDrop,
  addMiniSet,
  columnsFor,
  duplicateSet,
  mergeSets,
  newSet,
  nextSortOrder,
  removeSegment,
  setSegmentField,
  sortOrderBetween,
  splitSet,
  type SegmentField,
} from '@/lib/gym/sets';
import type { WarmupStep } from '@/lib/gym/tools';
import { applyIntensifier, protocolRestSec, protocolSets, protocolTimer, removeIntensifier } from '@/lib/gym/transforms';
import { formatWeight, fromKg, round, toKg } from '@/lib/gym/units';
import { useAuth, useConfirm, useSnackbar } from '@/providers';
import type { ExerciseHistoryEntry, WorkoutDetail } from '@/services/workouts';
import { useModuleNav } from '@/hooks/use-modules';
import { useGymStore } from '@/store/gym-store';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Exercise, WorkoutExercise, WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';
import { useLanguage, useT } from '@/i18n';

const MAX_WIDTH = 640;

/** Todo lo que el logger necesita saber de un ejercicio para pintarlo. */
type Analisis = {
  catalog: Exercise | null;
  columns: SegmentField[];
  previous: WorkoutSet[];
  prs: Map<string, PrKind[]>;
  legacyNote: string | null;
  historyLoaded: boolean;
};

/**
 * Sesión de gym: logger en vivo, lectura y edición con la misma pantalla
 * (spec 07 v2, RF-F27 – RF-F42).
 *
 * Las series viven en la cola local primero (RF-F17): marcar ✓ se ve al instante y el
 * envío va por detrás. Los ejercicios, en cambio, se crean en el servidor: son pocos por
 * sesión y no van al ritmo de las series.
 */
export default function WorkoutScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { href: moduloHref } = useModuleNav();
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { userId } = useAuth();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'view' | 'edit' }>();
  useLegacyConversion();
  const sesion = useSessionDetail(id);
  const { saveSet: enviarSerie, removeSet: retirarSerie } = useSetActions(id);
  const mutations = useWorkoutMutations();
  const queryClient = useQueryClient();
  const catalogo = useExercises();
  const prefs = useExercisePrefs();
  const { saveStickyNote } = useExerciseMutations();
  const tx = useT();
  const lang = useLanguage();
  const w = tx.fitness.workout;
  const unit = useGymStore((s) => s.weightUnit);
  const effortScale = useGymStore((s) => s.effortScale);
  const formula = useGymStore((s) => s.e1rmFormula);
  const restDefault = useGymStore((s) => s.restDefaultSec);
  const dropPercent = useGymStore((s) => s.dropPercent);
  const startRest = useGymStore((s) => s.startRest);
  const serio = useGymStore((s) => s.seriousMode);
  const trato = useGymStore((s) => s.trato);
  const hydrateGym = useGymStore((s) => s.hydrate);
  const setLastWorkoutTitle = usePreferencesStore((s) => s.setLastWorkoutTitle);

  const [editing, setEditing] = useState(mode !== 'view');
  const [pickingDate, setPickingDate] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [keepValues, setKeepValues] = useState(true);
  const [notes, setNotes] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  /** Qué se edita con el teclado y la copia de trabajo de esa serie. */
  const [teclado, setTeclado] = useState<{ target: EditTarget; draft: WorkoutSet } | null>(null);
  const [pesoCorporalAbierto, setPesoCorporalAbierto] = useState(false);
  const [pesoCorporal, setPesoCorporal] = useState<number | null>(null);
  const [menuSerie, setMenuSerie] = useState<{ exercise: WorkoutExerciseDetail; set: WorkoutSet } | null>(null);
  const [menuEjercicio, setMenuEjercicio] = useState<WorkoutExerciseDetail | null>(null);
  const [selector, setSelector] = useState<{ modo: 'agregar' } | { modo: 'cambiar'; exercise: WorkoutExercise } | { modo: 'variante'; setId: string; segmentIndex: number } | null>(null);
  /** El tramo de drop mecánico cuya variante se está eligiendo (RF-F44). */
  const [varianteDe, setVarianteDe] = useState<{ setId: string; segmentIndex: number } | null>(null);
  const [herramientasDe, setHerramientasDe] = useState<WorkoutExerciseDetail | null>(null);
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [horaAbierta, setHoraAbierta] = useState(false);
  const [duracionAbierta, setDuracionAbierta] = useState(false);
  const [duracion, setDuracion] = useState<number | null>(null);
  const [intensificadoresDe, setIntensificadoresDe] = useState<WorkoutSet | null>(null);
  const [detallesDe, setDetallesDe] = useState<WorkoutSet | null>(null);
  const [agruparDesde, setAgruparDesde] = useState<WorkoutExerciseDetail | null>(null);
  const [protocoloPara, setProtocoloPara] = useState<WorkoutExerciseDetail | null>(null);
  const [timerPara, setTimerPara] = useState<WorkoutExerciseDetail | null>(null);
  const [notaEjercicio, setNotaEjercicio] = useState<WorkoutExerciseDetail | null>(null);
  const [notaSerie, setNotaSerie] = useState<WorkoutSet | null>(null);
  const [notaFija, setNotaFija] = useState<WorkoutExerciseDetail | null>(null);
  const [reordenando, setReordenando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  /** Término del glosario abierto (RF-F64). */
  const [termino, setTermino] = useState<string | null>(null);
  /** Reloj de la sesión en curso: se lee aquí y se refresca cada 30 s, no en cada render. */
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    void hydrateGym();
  }, [hydrateGym]);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const data = sesion.data;
  const ejercicios = useMemo(() => data?.exercises ?? [], [data]);
  const porId = useMemo(() => new Map((catalogo.data ?? []).map((e) => [e.id, e])), [catalogo.data]);
  /** Nombre del ejercicio en el idioma activo, salvo que la persona lo haya cambiado (RF-I4). */
  const nombreDe = useCallback(
    (e: { name: string; exercise_id?: string | null }) => workoutExerciseName(e.name, e.exercise_id ? porId.get(e.exercise_id) : null, lang),
    [porId, lang],
  );
  const notasFijas = useMemo(() => new Map((prefs.data ?? []).filter((p) => p.sticky_note).map((p) => [p.exercise_id, p.sticky_note as string])), [prefs.data]);

  /*
   * Agrupaciones (RF-F45): una letra por grupo en el orden en que aparecen (A, B, C…) y un
   * número por posición dentro del grupo. Lo que no está agrupado no lleva etiqueta.
   */
  const grupos = useMemo(() => {
    const vivos = new Map((data?.groups ?? []).map((g) => [g.id, g]));
    const letra = new Map<string, string>();
    const etiqueta = new Map<string, string>();
    for (const e of ejercicios) {
      if (!e.group_id || !vivos.has(e.group_id)) continue;
      if (!letra.has(e.group_id)) letra.set(e.group_id, String.fromCharCode(65 + letra.size));
      etiqueta.set(e.id, `${letra.get(e.group_id)}${e.group_position ?? ''}`);
    }
    return { porId: vivos, etiqueta };
  }, [data?.groups, ejercicios]);

  // ── Edición con deshacer (RF-F40) ────────────────────────────────────────────────────
  const historia = useEditHistory();
  const { record: registrar } = historia;
  const seriePorId = useMemo(() => new Map(ejercicios.flatMap((e) => e.workout_sets).map((s) => [s.id, s])), [ejercicios]);
  const yaEditada = useRef(false);
  const estado = data?.status;
  const updateWorkout = mutations.update.mutate;

  /**
   * Tocar una sesión ya terminada la marca como editada (RF-F42), una vez por visita. En
   * vivo no: registrar una serie no es "editar".
   */
  const marcarSesionEditada = useCallback(() => {
    if (estado === 'active' || yaEditada.current) return;
    yaEditada.current = true;
    updateWorkout({ id, patch: { edited_at: new Date().toISOString() } });
  }, [estado, updateWorkout, id]);

  /** Guarda una serie recordando cómo estaba, para poder deshacerlo. */
  const guardar = useCallback(
    (set: WorkoutSet) => {
      const previa = seriePorId.get(set.id) ?? null;
      enviarSerie(set);
      marcarSesionEditada();
      registrar({ undo: () => (previa ? enviarSerie(previa) : retirarSerie(set.id)), redo: () => enviarSerie(set) });
    },
    [seriePorId, enviarSerie, retirarSerie, marcarSesionEditada, registrar],
  );

  const quitar = useCallback(
    (setId: string) => {
      const previa = seriePorId.get(setId);
      retirarSerie(setId);
      marcarSesionEditada();
      if (previa) registrar({ undo: () => enviarSerie(previa), redo: () => retirarSerie(setId) });
    },
    [seriePorId, enviarSerie, retirarSerie, marcarSesionEditada, registrar],
  );

  // El historial de todos los ejercicios de la sesión, en paralelo.
  const historiales = useQueries({
    queries: ejercicios.map((e) => exerciseHistoryQuery(userId, { exerciseId: e.exercise_id ?? null, name: e.name })),
  });
  const firmaHistoriales = historiales.map((h) => `${h.dataUpdatedAt}:${h.isSuccess}`).join(',');
  const historialDe = useMemo(() => {
    const m = new Map<string, { data: ExerciseHistoryEntry[]; loaded: boolean }>();
    ejercicios.forEach((e, i) => m.set(e.id, { data: (historiales[i]?.data as ExerciseHistoryEntry[] | undefined) ?? [], loaded: !!historiales[i]?.isSuccess }));
    return m;
    // `historiales` cambia de identidad en cada render; lo que importa es su firma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicios, firmaHistoriales]);

  const analisis = useMemo(() => {
    const m = new Map<string, Analisis>();
    for (const e of ejercicios) {
      const catalog = e.exercise_id ? porId.get(e.exercise_id) ?? null : null;
      const tracking = catalog?.tracking_type ?? 'weight_reps';
      const h = historialDe.get(e.id) ?? { data: [], loaded: false };
      const parse = hasLegacyText(e) ? parseLegacy(e, lang) : null;
      const legacyNote =
        parse?.ambiguous && e.legacy_converted_at
          ? w.legacyOriginal([e.sets ? w.legacySets(e.sets) : null, e.reps, e.weight].filter(Boolean).join(' · '), parse.reasons[0] ?? '')
          : null;
      m.set(e.id, {
        catalog,
        columns: columnsFor(tracking, catalog?.laterality === 'unilateral'),
        previous: previousSets(h.data, id),
        prs: sessionPRs(e.workout_sets, h.data, id, tracking, data?.bodyweight_kg ?? null, formula),
        legacyNote,
        historyLoaded: h.loaded,
      });
    }
    return m;
  }, [ejercicios, porId, historialDe, id, data?.bodyweight_kg, formula, w, lang]);

  // Un PR nuevo vibra (Android). Se compara contra el total anterior para no vibrar al abrir.
  const totalPRs = useMemo(() => [...analisis.values()].reduce((n, a) => n + a.prs.size, 0), [analisis]);
  const prsPrevios = useRef<number | null>(null);
  useEffect(() => {
    if (prsPrevios.current !== null && totalPRs > prsPrevios.current) {
      success();
      // Celebración corta (RF-F56); en Modo serio solo queda el badge de la serie.
      const frase = gymratLine('pr', trato, serio);
      if (frase) showSnackbar({ message: frase });
    }
    prsPrevios.current = totalPRs;
  }, [totalPRs, trato, serio, showSnackbar]);

  /*
   * Un ejercicio recién agregado nace con su primera serie, prellenada con la de la vez
   * pasada: así lo primero que se ve ya se puede marcar. Se espera al historial para poder
   * prellenarla, y no se toca lo que viene de v1 sin convertir (la conversión le pone sus
   * propias series).
   */
  const sembrados = useRef(new Set<string>());
  useEffect(() => {
    if (!editing || !data) return;
    for (const e of ejercicios) {
      const a = analisis.get(e.id);
      if (!a?.historyLoaded || e.workout_sets.length > 0 || sembrados.current.has(e.id)) continue;
      if (hasLegacyText(e) && !e.legacy_converted_at) continue;
      sembrados.current.add(e.id);
      enviarSerie(newSet(e.id, 1, a.previous[0] ?? null, unit));
    }
  }, [editing, data, ejercicios, analisis, enviarSerie, unit]);

  const close = () => (router.canGoBack() ? router.back() : router.replace(moduloHref('fitness')));

  const ejercicioDe = useCallback((set: WorkoutSet) => ejercicios.find((e) => e.id === set.workout_exercise_id) ?? null, [ejercicios]);

  // ── Acciones de serie ────────────────────────────────────────────────────────────────

  const agregarSerie = useCallback(
    (exercise: WorkoutExerciseDetail) => {
      const ultima = exercise.workout_sets[exercise.workout_sets.length - 1] ?? null;
      const desde = ultima ?? analisis.get(exercise.id)?.previous[exercise.workout_sets.length] ?? null;
      guardar(newSet(exercise.id, nextSortOrder(exercise.workout_sets), desde, unit));
    },
    [analisis, guardar, unit],
  );

  const alternar = useCallback(
    (exercise: WorkoutExerciseDetail, set: WorkoutSet) => {
      const hecha = !set.completed_at;
      tap();
      guardar({ ...set, completed_at: hecha ? new Date().toISOString() : null });
      if (hecha && data?.status === 'active') {
        const grupo = exercise.group_id ? grupos.porId.get(exercise.group_id) : undefined;
        if (grupo) {
          /*
           * En una agrupación no se descansa entre ejercicios: se pasa al siguiente del grupo
           * y el descanso corre al terminar la ronda (RF-F45).
           */
          const miembros = ejercicios.filter((e) => e.group_id === grupo.id).sort((a, b) => (a.group_position ?? 0) - (b.group_position ?? 0));
          const i = miembros.findIndex((e) => e.id === exercise.id);
          const siguienteEj = miembros[i + 1];
          if (siguienteEj) {
            showSnackbar({ message: w.next(grupos.etiqueta.get(siguienteEj.id) ?? '', nombreDe(siguienteEj)) });
            return;
          }
          startRest(id, grupo.rest_after_round_sec ?? exercise.rest_target_sec ?? restDefault, w.nextRound(grupos.etiqueta.get(miembros[0].id) ?? '', nombreDe(miembros[0])));
          return;
        }
        // Un drop o unas myo terminadas tienen su frase (RF-F55); un PR la reemplaza después.
        const kinds = set.segments.map((g) => g.kind);
        const frase = kinds.includes('drop') ? gymratLine('drop', trato, serio, lang) : kinds.some((k) => k === 'myo_activation' || k === 'myo_mini') ? gymratLine('myo', trato, serio, lang) : null;
        if (frase) showSnackbar({ message: frase });
        const indice = exercise.workout_sets.findIndex((s) => s.id === set.id);
        const siguiente = exercise.workout_sets[indice + 1];
        const etiqueta = siguiente ? w.restSet(nombreDe(exercise), indice + 2) : nombreDe(exercise);
        startRest(id, exercise.rest_target_sec ?? restDefault, etiqueta);
      }
    },
    [guardar, data?.status, startRest, id, restDefault, grupos, ejercicios, showSnackbar, trato, serio, lang, w, nombreDe],
  );

  const copiarAnterior = useCallback(
    (set: WorkoutSet, previa: WorkoutSet) => {
      tap();
      const fuente = previa.segments[0];
      if (!fuente) return;
      guardar({
        ...set,
        segments: set.segments.map((g, i) =>
          i === 0
            ? { ...g, weight_kg: fuente.weight_kg, input_unit: fuente.input_unit, reps: fuente.reps, reps_left: fuente.reps_left, reps_right: fuente.reps_right, duration_sec: fuente.duration_sec, distance_m: fuente.distance_m }
            : g,
        ),
      });
    },
    [guardar],
  );

  const duplicar = useCallback(
    (exercise: WorkoutExerciseDetail, set: WorkoutSet) => {
      const i = exercise.workout_sets.findIndex((s) => s.id === set.id);
      const siguiente = exercise.workout_sets[i + 1]?.sort_order ?? null;
      guardar(duplicateSet(set, sortOrderBetween(set.sort_order, siguiente)));
    },
    [guardar],
  );

  const borrarSerie = useCallback(
    (_exercise: WorkoutExerciseDetail, set: WorkoutSet) => {
      quitar(set.id);
      // El borrado es suave: deshacer es volver a guardar la misma serie (RF-F33).
      showSnackbar({ message: w.setDeleted, actionLabel: w.undo, onAction: () => guardar(set) });
    },
    [quitar, guardar, showSnackbar, w],
  );

  /** Unir dos series en una: la segunda pasa a ser tramo de la primera (RF-F39). */
  const unir = (a: WorkoutSet, b: WorkoutSet, kind: 'drop' | 'rest_pause') =>
    historia.batch(() => {
      guardar(mergeSets(a, b, kind));
      quitar(b.id);
    });

  /** Arrastrar una serie: su nuevo `sort_order` queda entre sus nuevos vecinos (RF-F33). */
  const moverSerie = useCallback(
    (exercise: WorkoutExerciseDetail, from: number, to: number) => {
      const resto = exercise.workout_sets.filter((_, i) => i !== from);
      const set = exercise.workout_sets[from];
      if (!set || from === to) return;
      guardar({ ...set, sort_order: sortOrderBetween(resto[to - 1]?.sort_order ?? null, resto[to]?.sort_order ?? null) });
    },
    [guardar],
  );

  /** Pone (o quita) la variante del tramo de un drop mecánico. */
  const ponerVariante = useCallback(
    (setId: string, segmentIndex: number, variantId: string | null) => {
      const set = seriePorId.get(setId);
      if (!set) return;
      guardar({ ...set, segments: set.segments.map((g, i) => (i === segmentIndex ? { ...g, variant_exercise_id: variantId } : g)) });
    },
    [seriePorId, guardar],
  );
  const abrirVariante = useCallback((set: WorkoutSet, segmentIndex: number) => setVarianteDe({ setId: set.id, segmentIndex }), []);
  const nombreEjercicio = useCallback((exId: string) => { const ex = porId.get(exId); return ex ? exerciseName(ex, lang) : null; }, [porId, lang]);

  const quitarSegmento = useCallback((set: WorkoutSet, i: number) => guardar(removeSegment(set, i)), [guardar]);

  const abrirTeclado = useCallback(
    (target: EditTarget) => {
      const set = ejercicios.flatMap((e) => e.workout_sets).find((s) => s.id === target.setId);
      if (set) setTeclado({ target, draft: set });
    },
    [ejercicios],
  );

  const cerrarTeclado = () => {
    if (teclado) guardar(teclado.draft);
    setTeclado(null);
  };

  /** Peso → reps → esfuerzo, y luego se cierra (RF-F28). */
  const siguienteCampo = () => {
    if (!teclado) return;
    guardar(teclado.draft);
    const ex = ejercicioDe(teclado.draft);
    const proximo = nextNumpadTarget(teclado.target, analisis.get(ex?.id ?? '')?.columns ?? []);
    setTeclado(proximo ? { target: proximo, draft: teclado.draft } : null);
  };

  const campoTeclado = useMemo((): NumpadField | null => {
    if (!teclado) return null;
    const { draft, target } = teclado;
    const ex = ejercicioDe(draft);
    const numero = (ex?.workout_sets.findIndex((s) => s.id === draft.id) ?? 0) + 1;
    const prefijo = w.numpadTitle(ex ? nombreDe(ex) : w.setFallback, numero, target.segmentIndex > 0 ? target.segmentIndex + 1 : null);
    return numpadFieldFor(target, draft, prefijo, effortScale, unit, lang);
  }, [teclado, ejercicioDe, effortScale, unit, w, nombreDe, lang]);

  const cambiarValor = (valor: number | null) => {
    if (!teclado) return;
    setTeclado({ target: teclado.target, draft: applyNumpadValue(teclado.draft, teclado.target, valor, effortScale, unit) });
  };

  // ── Acciones de ejercicio ────────────────────────────────────────────────────────────

  /** Borrado suave: deshacer restaura el mismo ejercicio con sus series (RF-F6). */
  const deleteExercise = (exercise: WorkoutExercise) => {
    mutations.removeExercise.mutate(exercise.id, {
      onSuccess: () =>
        showSnackbar({
          message: w.exerciseRemoved(nombreDe(exercise) || w.exerciseFallback),
          actionLabel: w.undo,
          onAction: () => mutations.restoreExercise.mutate(exercise.id),
        }),
    });
  };

  const mover = (exercise: WorkoutExercise, direccion: -1 | 1) => {
    const i = ejercicios.findIndex((e) => e.id === exercise.id);
    const otro = ejercicios[i + direccion];
    if (!otro) return;
    // Se intercambian posiciones; si eran iguales (v1 a veces las repetía), se separan.
    const [a, b] = otro.position === exercise.position ? [i + direccion, i] : [otro.position, exercise.position];
    mutations.updateExercise.mutate({ id: exercise.id, patch: { position: a } });
    mutations.updateExercise.mutate({ id: otro.id, patch: { position: b } }, { onSuccess: () => void sesion.refetch() });
  };

  /**
   * Nuevo orden de ejercicios desde la hoja de reordenar (RF-F33). Se ve al instante en el
   * caché y se guardan solo las posiciones que cambiaron.
   */
  const reordenarEjercicios = (ids: string[]) => {
    const cambios = ids.map((exId, posicion) => ({ exId, posicion })).filter(({ exId, posicion }) => ejercicios.find((e) => e.id === exId)?.position !== posicion);
    if (cambios.length === 0) return;
    queryClient.setQueryData<WorkoutDetail>(workoutKeys.detail(id), (previo) => {
      if (!previo) return previo;
      const porId = new Map(previo.exercises.map((e) => [e.id, e]));
      const ordenados = ids.flatMap((exId, posicion) => {
        const e = porId.get(exId);
        return e ? [{ ...e, position: posicion }] : [];
      });
      return { ...previo, exercises: ordenados };
    });
    marcarSesionEditada();
    void Promise.allSettled(cambios.map(({ exId, posicion }) => mutations.updateExercise.mutateAsync({ id: exId, patch: { position: posicion } }))).then(() => sesion.refetch());
  };

  const agregarCalentamiento = (exercise: WorkoutExerciseDetail, pasos: WarmupStep[]) => {
    const primera = exercise.workout_sets[0]?.sort_order ?? 1;
    historia.batch(() => pasos.forEach((p, i) => {
      let s: WorkoutSet = { ...newSet(exercise.id, primera - (pasos.length - i), null, unit), set_type: 'warmup' };
      s = setSegmentField(setSegmentField(s, 0, 'weight_kg', p.weight, unit), 0, 'reps', p.reps, unit);
      guardar(s);
    }));
    setHerramientasDe(null);
  };

  /**
   * Un protocolo genera las series con sus objetivos (RF-F46). Lo pendiente de ese
   * ejercicio se reemplaza; lo ya hecho se queda, y las nuevas van después. El peso de
   * trabajo es el de la última serie, o el de la vez pasada.
   */
  const aplicarProtocolo = (exercise: WorkoutExerciseDetail, key: ProtocolKey) => {
    const hechas = exercise.workout_sets.filter((s) => s.completed_at);
    const pendientes = exercise.workout_sets.filter((s) => !s.completed_at);
    const pesoTrabajo =
      [...exercise.workout_sets].reverse().find((s) => s.segments[0]?.weight_kg)?.segments[0]?.weight_kg ??
      analisis.get(exercise.id)?.previous[0]?.segments[0]?.weight_kg ??
      null;
    const nuevas = protocolSets(key, exercise.id, nextSortOrder(hechas), pesoTrabajo, unit);
    historia.batch(() => {
      pendientes.forEach((s) => quitar(s.id));
      nuevas.forEach(guardar);
    });
    mutations.updateExercise.mutate({ id: exercise.id, patch: { protocol: key, rest_target_sec: protocolRestSec(key) } }, { onSuccess: () => void sesion.refetch() });
  };

  // ── Sesión ───────────────────────────────────────────────────────────────────────────

  const terminar = () => {
    if (!data) return;
    mutations.update.mutate({ id: data.id, patch: { status: 'completed', ended_at: new Date().toISOString() } });
    useGymStore.getState().stopRest();
    setResumenAbierto(true);
  };

  const descartar = async () => {
    if (!data) return;
    const ok = await confirm({ title: w.discardTitle, message: w.discardMessage, confirmLabel: w.discard, destructive: true });
    if (!ok) return;
    useGymStore.getState().stopRest();
    mutations.update.mutate({ id: data.id, patch: { status: 'discarded' } }, { onSuccess: close });
  };

  const deleteWorkout = async () => {
    if (!data) return;
    const ok = await confirm({ title: w.deleteTitle, message: w.deleteMessage, confirmLabel: w.delete, destructive: true });
    if (!ok) return;
    mutations.remove.mutate(data.id, { onSuccess: () => { showSnackbar({ message: w.deleted }); close(); } });
  };

  const resumen = useMemo(() => {
    if (!data) return null;
    return sessionSummary(
      ejercicios.map((e) => ({
        sets: e.workout_sets,
        ctx: { trackingType: analisis.get(e.id)?.catalog?.tracking_type ?? 'weight_reps', bodyweightKg: data.bodyweight_kg },
        prs: analisis.get(e.id)?.prs ?? new Map<string, PrKind[]>(),
      })),
      data.performed_at,
      data.ended_at ?? new Date().toISOString(),
    );
  }, [data, ejercicios, analisis]);

  if (sesion.isPending) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title={w.title} />
        <LoadingState />
      </Screen>
    );
  }
  if (sesion.isError || !data) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title={w.title} />
        <ErrorState message={sesion.error?.message ?? w.notFound} onRetry={() => sesion.refetch()} />
      </Screen>
    );
  }

  const enCurso = data.status === 'active';
  const siguienteDeMenu = menuSerie
    ? menuSerie.exercise.workout_sets[menuSerie.exercise.workout_sets.findIndex((s) => s.id === menuSerie.set.id) + 1] ?? null
    : null;
  const notesValue = notes ?? data.notes ?? '';
  const titleValue = title ?? data.title ?? '';
  const encabezado = data.title || data.activity_title || w.freeWorkout;
  const minutos = enCurso ? Math.max(0, Math.round((ahora - fromIso(data.performed_at).getTime()) / 60_000)) : null;
  /** Editar una sesión ya terminada la marca como editada (RF-F42); en vivo, no. */
  const marcarEditado = () => (enCurso ? {} : { edited_at: new Date().toISOString() });
  /** Duración de una sesión terminada: de que empezó a que se marcó terminada. */
  /** Energía, pump y etiquetas de la sesión en una línea, para el modo lectura (RF-F49). */
  const sesionChips = [data.energy ? w.energyChip(data.energy) : null, data.pump ? w.pumpChip(data.pump) : null, ...data.tags.map((g) => tagLabel(g, lang))].filter(Boolean).join(' · ');
  const duracionMin = data.ended_at ? Math.max(1, Math.round((fromIso(data.ended_at).getTime() - fromIso(data.performed_at).getTime()) / 60_000)) : null;

  return (
    <View style={styles.raiz}>
      <Screen modal scroll scrollEnabled={!arrastrando} maxWidth={MAX_WIDTH}>
        <ModalHeader
          title={enCurso ? w.inProgress : w.title}
          right={
            editing ? (
              <View style={styles.historia}>
                <IconButton label={w.undo} onPress={historia.undo} disabled={!historia.canUndo}>
                  <Undo2 size={IconSize.action} strokeWidth={IconStroke} color={historia.canUndo ? theme.text : theme.textTertiary} />
                </IconButton>
                <IconButton label={w.redo} onPress={historia.redo} disabled={!historia.canRedo}>
                  <Redo2 size={IconSize.action} strokeWidth={IconStroke} color={historia.canRedo ? theme.text : theme.textTertiary} />
                </IconButton>
              </View>
            ) : (
              <Button title={w.edit} variant="ghost" icon={<Pencil size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setEditing(true)} />
            )
          }
        />

        {mutations.update.error || mutations.addExercise.error ? (
          <Banner tone="error" message={(mutations.update.error ?? mutations.addExercise.error)?.message ?? ''} />
        ) : null}

        <View style={[styles.headerCard, { backgroundColor: theme.surfaceAlt }]}>
          {editing ? (
            <TextField
              label={w.name}
              value={titleValue}
              onChangeText={setTitle}
              onBlur={() => {
                const limpio = titleValue.trim();
                if (limpio === (data.title ?? '')) return;
                mutations.update.mutate({ id: data.id, patch: { title: limpio || null } }, { onSuccess: () => { if (limpio) setLastWorkoutTitle(limpio); } });
              }}
              placeholder={data.activity_title ?? w.namePlaceholder}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          ) : (
            <AppText variant="heading">{encabezado}</AppText>
          )}
          <AppText color="textSecondary">
            {formatDate(fromIso(data.performed_at), lang)}
            {minutos !== null ? w.minutesRunning(minutos) : data.edited_at ? w.edited : ''}
          </AppText>
          {editing ? (
            <View style={styles.camposFila}>
              <View style={styles.flex}>
                <FieldButton
                  label={w.date}
                  value={formatShortDate(fromIso(data.performed_at), lang)}
                  onPress={() => setPickingDate(true)}
                  leading={<CalendarDays size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                />
              </View>
              <View style={styles.flex}>
                <FieldButton
                  label={w.bodyweight}
                  value={data.bodyweight_kg ? formatWeight(data.bodyweight_kg, unit) : null}
                  placeholder={w.optional}
                  onPress={() => {
                    setPesoCorporal(data.bodyweight_kg ? round(fromKg(data.bodyweight_kg, unit), 1) : null);
                    setPesoCorporalAbierto(true);
                  }}
                  leading={<Scale size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                />
              </View>
            </View>
          ) : null}
          {editing && !enCurso ? (
            <View style={styles.camposFila}>
              <View style={styles.flex}>
                <FieldButton
                  label={w.time}
                  value={formatTime(fromIso(data.performed_at), lang)}
                  onPress={() => setHoraAbierta(true)}
                  leading={<Clock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                />
              </View>
              <View style={styles.flex}>
                <FieldButton
                  label={w.duration}
                  value={duracionMin !== null ? `${duracionMin} min` : null}
                  placeholder={w.notLogged}
                  onPress={() => {
                    setDuracion(duracionMin);
                    setDuracionAbierta(true);
                  }}
                  leading={<Timer size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                />
              </View>
            </View>
          ) : null}
          {editing ? (
            <>
              <Escala titulo={w.energy} valor={data.energy} onChange={(v) => updateWorkout({ id: data.id, patch: { energy: v, ...marcarEditado() } })} />
              <Escala titulo={w.pump} valor={data.pump} onChange={(v) => updateWorkout({ id: data.id, patch: { pump: v, ...marcarEditado() } })} />
              <View style={styles.chips}>
                {SESSION_TAGS.map((t) => {
                  const puesta = data.tags.includes(t.value);
                  return (
                    <Chip
                      key={t.value}
                      compact
                      label={tagLabel(t.value, lang)}
                      selected={puesta}
                      onPress={() => updateWorkout({ id: data.id, patch: { tags: puesta ? data.tags.filter((x) => x !== t.value) : [...data.tags, t.value], ...marcarEditado() } })}
                    />
                  );
                })}
              </View>
            </>
          ) : sesionChips ? (
            <AppText variant="label" color="textSecondary">
              {sesionChips}
            </AppText>
          ) : null}
          {editing ? (
            <TextField
              label={w.generalNotes}
              value={notesValue}
              onChangeText={setNotes}
              onBlur={() => mutations.update.mutate({ id: data.id, patch: { notes: notesValue.trim() || null } })}
              placeholder={w.notesPlaceholder}
              multiline
            />
          ) : data.notes ? (
            <AppText>{data.notes}</AppText>
          ) : null}
        </View>

        <View style={styles.section}>
          {ejercicios.length === 0 ? (
            <AppText color="textSecondary">{editing ? w.addFirst : w.noExercises}</AppText>
          ) : null}
          {ejercicios.map((exercise) => {
            const a = analisis.get(exercise.id);
            if (!a) return null;
            return (
              <ExerciseBlock
                key={exercise.id}
                exercise={exercise}
                catalog={a.catalog}
                columns={a.columns}
                previous={a.previous}
                prs={a.prs}
                pendientes={sesion.pendientes}
                unit={unit}
                effortScale={effortScale}
                editable={editing}
                legacyNote={a.legacyNote}
                groupLabel={grupos.etiqueta.get(exercise.id) ?? null}
                protocolLabel={exercise.protocol ? protocolLabel(exercise.protocol, lang) : null}
                stickyNote={exercise.exercise_id ? notasFijas.get(exercise.exercise_id) ?? null : null}
                celebrate={!serio}
                onOpenTimer={exercise.protocol && protocolTimer(exercise.protocol as ProtocolKey) ? setTimerPara : undefined}
                onAddSet={agregarSerie}
                onEdit={abrirTeclado}
                onToggle={alternar}
                onCopyPrevious={copiarAnterior}
                onSetMenu={(ex, set) => setMenuSerie({ exercise: ex, set })}
                onDuplicate={duplicar}
                onDelete={borrarSerie}
                onRemoveSegment={quitarSegmento}
                onMoveSet={moverSerie}
                onPickVariant={abrirVariante}
                onExplain={setTermino}
                exerciseName={nombreEjercicio}
                onDragStateChange={setArrastrando}
                onExerciseMenu={setMenuEjercicio}
                onOpenDetail={(ex) => {
                  if (ex.exercise_id) router.push({ pathname: '/(app)/exercise/[id]', params: { id: ex.exercise_id } });
                }}
              />
            );
          })}
          {editing && ejercicios.length > 1 ? (
            <Button
              title={w.reorder}
              variant="ghost"
              icon={<GripVertical size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
              onPress={() => setReordenando(true)}
            />
          ) : null}
          {editing ? (
            <Button
              title={w.addExercise}
              variant="secondary"
              icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
              loading={mutations.addExercise.isPending}
              onPress={() => setSelector({ modo: 'agregar' })}
            />
          ) : null}
        </View>

        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          {enCurso ? <Button title={w.finish} onPress={terminar} /> : null}
          <Button title={w.duplicateIn} variant="secondary" icon={<Copy size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setDuplicateOpen(true)} />
          {enCurso ? <Button title={w.discardSession} variant="ghost" onPress={descartar} /> : null}
          {editing && !enCurso ? (
            <Button title={w.deleteWorkout} variant="danger" icon={<Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />} onPress={deleteWorkout} />
          ) : null}
          {editing && !enCurso ? <Button title={w.done} onPress={close} /> : null}
        </View>
      </Screen>

      <View style={styles.timer} pointerEvents="box-none">
        <RestTimerBar workoutId={data.id} />
      </View>

      <NumpadSheet visible={teclado !== null} field={campoTeclado} onChange={cambiarValor} onClose={cerrarTeclado} onNext={siguienteCampo} />

      <TimePickerSheet
        visible={horaAbierta}
        value={fromIso(data.performed_at).getHours() * 60 + fromIso(data.performed_at).getMinutes()}
        title={w.startTime}
        onClose={() => setHoraAbierta(false)}
        onSelect={(minutos) => {
          // Cambiar la hora mueve la sesión entera: la duración se conserva.
          const inicio = fromIso(data.performed_at);
          const nuevo = new Date(inicio);
          nuevo.setHours(Math.floor(minutos / 60), minutos % 60, 0, 0);
          const corrimiento = nuevo.getTime() - inicio.getTime();
          const fin = data.ended_at ? toIso(new Date(fromIso(data.ended_at).getTime() + corrimiento)) : null;
          updateWorkout({ id: data.id, patch: { performed_at: toIso(nuevo), ended_at: fin, ...marcarEditado() } });
          setHoraAbierta(false);
        }}
      />

      <NumpadSheet
        visible={duracionAbierta}
        field={{ title: w.sessionDuration, value: duracion, step: 5, decimals: false, suffix: 'min', min: 1, max: 600 }}
        onChange={setDuracion}
        onClose={() => {
          setDuracionAbierta(false);
          if (duracion === duracionMin) return;
          const fin = duracion ? toIso(new Date(fromIso(data.performed_at).getTime() + duracion * 60_000)) : null;
          updateWorkout({ id: data.id, patch: { ended_at: fin, ...marcarEditado() } });
        }}
      />

      <NumpadSheet
        visible={pesoCorporalAbierto}
        field={{ title: w.bodyweightToday, value: pesoCorporal, step: unit === 'kg' ? 0.5 : 1, decimals: true, suffix: unit, min: 0, max: 400 }}
        onChange={setPesoCorporal}
        onClose={() => {
          setPesoCorporalAbierto(false);
          mutations.update.mutate({ id: data.id, patch: { bodyweight_kg: pesoCorporal ? toKg(pesoCorporal, unit) : null, ...marcarEditado() } });
        }}
      />

      <Sheet visible={menuSerie !== null} onClose={() => setMenuSerie(null)} title={w.setSheet}>
        {menuSerie ? (
          <>
            <AppText variant="label" color="textSecondary">
              {w.setType}
            </AppText>
            <View style={styles.chips}>
              {SET_TYPES.map((t) => (
                <Chip
                  key={t.value}
                  compact
                  label={setTypeLabel(t.value, lang)}
                  selected={menuSerie.set.set_type === t.value}
                  onPress={() => {
                    // La hoja sigue abierta: así se lee qué significa cada tipo antes de cerrar.
                    const nueva = { ...menuSerie.set, set_type: t.value };
                    guardar(nueva);
                    setMenuSerie({ ...menuSerie, set: nueva });
                  }}
                />
              ))}
            </View>
            <AppText variant="caption" color="textTertiary">
              {setTypeDescription(menuSerie.set.set_type, lang)}
            </AppText>
            <ActionRow
              icon={<Sparkles size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.intensifier}
              onPress={() => {
                setIntensificadoresDe(menuSerie.set);
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<MessageSquareText size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={menuSerie.set.notes || menuSerie.set.tags.length ? w.editNoteTags : w.noteTags}
              onPress={() => {
                setNotaSerie(menuSerie.set);
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<SlidersHorizontal size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.details}
              onPress={() => {
                setDetallesDe(menuSerie.set);
                setMenuSerie(null);
              }}
            />
            {menuSerie.set.intensifiers.includes('forced_reps') ? (
              <ActionRow
                icon={<Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={w.forcedReps}
                onPress={() => {
                  const set = menuSerie.set;
                  setMenuSerie(null);
                  setTeclado({ target: { setId: set.id, segmentIndex: 0, field: 'forced_reps' }, draft: set });
                }}
              />
            ) : null}
            {menuSerie.set.intensifiers.includes('cheat_reps') ? (
              <ActionRow
                icon={<Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={w.cheatReps}
                onPress={() => {
                  const set = menuSerie.set;
                  setMenuSerie(null);
                  setTeclado({ target: { setId: set.id, segmentIndex: 0, field: 'cheat_reps' }, draft: set });
                }}
              />
            ) : null}
            <ActionRow
              icon={<Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.addDrop(dropPercent)}
              onPress={() => {
                guardar(addDrop(menuSerie.set, dropPercent));
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<Repeat2 size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.addMini}
              onPress={() => {
                guardar(addMiniSet(menuSerie.set));
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.partialReps}
              onPress={() => {
                const set = menuSerie.set;
                setMenuSerie(null);
                setTeclado({ target: { setId: set.id, segmentIndex: 0, field: 'partial_reps' }, draft: set });
              }}
            />
            {menuSerie.set.segments.length > 1 ? (
              <ActionRow
                icon={<Scissors size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={w.split}
                onPress={() => {
                  const sets = menuSerie.exercise.workout_sets;
                  const i = sets.findIndex((s) => s.id === menuSerie.set.id);
                  const partes = splitSet(menuSerie.set, sets[i + 1]?.sort_order ?? null);
                  historia.batch(() => partes.forEach(guardar));
                  setMenuSerie(null);
                }}
              />
            ) : null}
            {siguienteDeMenu ? (
              <>
                <ActionRow
                  icon={<Merge size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label={w.mergeDrop}
                  onPress={() => {
                    unir(menuSerie.set, siguienteDeMenu, 'drop');
                    setMenuSerie(null);
                  }}
                />
                <ActionRow
                  icon={<Merge size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label={w.mergeRestPause}
                  onPress={() => {
                    unir(menuSerie.set, siguienteDeMenu, 'rest_pause');
                    setMenuSerie(null);
                  }}
                />
              </>
            ) : null}
            {ejercicios.length > 1 ? (
              <>
                <AppText variant="label" color="textSecondary">
                  {w.moveTo}
                </AppText>
                <View style={styles.chips}>
                  {ejercicios
                    .filter((e) => e.id !== menuSerie.exercise.id)
                    .map((destino) => (
                      <Chip
                        key={destino.id}
                        compact
                        label={nombreDe(destino)}
                        selected={false}
                        onPress={() => {
                          // La serie conserva todo; solo cambia de ejercicio y va al final.
                          guardar({ ...menuSerie.set, workout_exercise_id: destino.id, sort_order: nextSortOrder(destino.workout_sets) });
                          setMenuSerie(null);
                        }}
                      />
                    ))}
                </View>
              </>
            ) : null}
            <ActionRow
              icon={<Copy size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.duplicate}
              onPress={() => {
                duplicar(menuSerie.exercise, menuSerie.set);
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<ArrowUp size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.moveUp}
              onPress={() => {
                const sets = menuSerie.exercise.workout_sets;
                const i = sets.findIndex((s) => s.id === menuSerie.set.id);
                if (i > 0) guardar({ ...menuSerie.set, sort_order: sortOrderBetween(sets[i - 2]?.sort_order ?? null, sets[i - 1].sort_order) });
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<ArrowDown size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.moveDown}
              onPress={() => {
                const sets = menuSerie.exercise.workout_sets;
                const i = sets.findIndex((s) => s.id === menuSerie.set.id);
                if (i < sets.length - 1) guardar({ ...menuSerie.set, sort_order: sortOrderBetween(sets[i + 1].sort_order, sets[i + 2]?.sort_order ?? null) });
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label={w.deleteSet}
              color="danger"
              onPress={() => {
                borrarSerie(menuSerie.exercise, menuSerie.set);
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
              icon={<MessageSquareText size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={menuEjercicio.notes ? w.editTodayNote : w.todayNote}
              onPress={() => {
                setNotaEjercicio(menuEjercicio);
                setMenuEjercicio(null);
              }}
            />
            {menuEjercicio.exercise_id ? (
              <ActionRow
                icon={<Pin size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={notasFijas.has(menuEjercicio.exercise_id) ? w.editPinnedNote : w.pinnedNoteAll}
                onPress={() => {
                  setNotaFija(menuEjercicio);
                  setMenuEjercicio(null);
                }}
              />
            ) : null}
            <ActionRow
              icon={<Wrench size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.tools}
              onPress={() => {
                setHerramientasDe(menuEjercicio);
                setMenuEjercicio(null);
              }}
            />
            {menuEjercicio.group_id && grupos.porId.has(menuEjercicio.group_id) ? (
              <ActionRow
                icon={<Unlink size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={w.ungroup}
                onPress={() => {
                  if (menuEjercicio.group_id) mutations.removeGroup.mutate(menuEjercicio.group_id, { onSuccess: () => void sesion.refetch() });
                  setMenuEjercicio(null);
                }}
              />
            ) : (
              <ActionRow
                icon={<Link2 size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={w.group}
                onPress={() => {
                  setAgruparDesde(menuEjercicio);
                  setMenuEjercicio(null);
                }}
              />
            )}
            <ActionRow
              icon={<ListOrdered size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.applyProtocol}
              onPress={() => {
                setProtocoloPara(menuEjercicio);
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<Repeat2 size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.changeExercise}
              onPress={() => {
                setSelector({ modo: 'cambiar', exercise: menuEjercicio });
                setMenuEjercicio(null);
              }}
            />
            {ejercicios.length > 1 ? (
              <ActionRow
                icon={<GripVertical size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label={w.reorderMore}
                onPress={() => {
                  setReordenando(true);
                  setMenuEjercicio(null);
                }}
              />
            ) : null}
            <ActionRow
              icon={<ArrowUp size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.moveUp}
              onPress={() => {
                mover(menuEjercicio, -1);
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<ArrowDown size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={w.moveDown}
              onPress={() => {
                mover(menuEjercicio, 1);
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<X size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label={w.removeExercise}
              color="danger"
              onPress={() => {
                deleteExercise(menuEjercicio);
                setMenuEjercicio(null);
              }}
            />
          </>
        ) : null}
      </Sheet>

      <IntensifierSheet
        visible={intensificadoresDe !== null}
        active={intensificadoresDe ? seriePorId.get(intensificadoresDe.id)?.intensifiers ?? intensificadoresDe.intensifiers : []}
        onClose={() => setIntensificadoresDe(null)}
        onToggle={(key, activo) => {
          const actual = intensificadoresDe ? seriePorId.get(intensificadoresDe.id) ?? intensificadoresDe : null;
          if (!actual) return;
          const nueva = activo ? applyIntensifier(actual, key, { dropPercent }) : removeIntensifier(actual, key);
          guardar(nueva);
          if (activo && key === 'mechanical_drop') {
            // El drop mecánico necesita saber a qué variante se pasa: se pregunta de una vez.
            const tramo = nueva.segments.map((g) => g.kind).lastIndexOf('drop');
            setIntensificadoresDe(null);
            if (tramo > 0) setVarianteDe({ setId: nueva.id, segmentIndex: tramo });
            return;
          }
          setIntensificadoresDe(nueva);
        }}
      />

      <NoteSheet
        visible={notaEjercicio !== null}
        title={w.todayNote}
        hint={notaEjercicio ? w.todayNoteHint(nombreDe(notaEjercicio)) : undefined}
        placeholder={w.todayNotePlaceholder}
        initialText={notaEjercicio?.notes ?? null}
        onClose={() => setNotaEjercicio(null)}
        onSave={(texto) => {
          if (!notaEjercicio) return;
          mutations.updateExercise.mutate({ id: notaEjercicio.id, patch: { notes: texto } }, { onSuccess: () => void sesion.refetch() });
          marcarSesionEditada();
        }}
      />

      <NoteSheet
        visible={notaSerie !== null}
        title={w.setNote}
        placeholder={w.setNotePlaceholder}
        maxLength={140}
        initialText={notaSerie?.notes ?? null}
        tagOptions={SET_TAGS}
        initialTags={notaSerie?.tags}
        onClose={() => setNotaSerie(null)}
        onSave={(texto, tags) => {
          const actual = notaSerie ? seriePorId.get(notaSerie.id) ?? notaSerie : null;
          if (actual) guardar({ ...actual, notes: texto, tags });
        }}
      />

      <NoteSheet
        visible={notaFija !== null}
        title={w.pinnedNote}
        hint={notaFija ? w.pinnedNoteHint(nombreDe(notaFija)) : undefined}
        placeholder={w.pinnedNoteExample}
        initialText={notaFija?.exercise_id ? notasFijas.get(notaFija.exercise_id) ?? null : null}
        onClose={() => setNotaFija(null)}
        onSave={(texto) => {
          if (notaFija?.exercise_id) saveStickyNote.mutate({ exerciseId: notaFija.exercise_id, note: texto });
        }}
      />

      <ReorderExercisesSheet
        visible={reordenando}
        exercises={ejercicios.map((e) => ({ ...e, name: nombreDe(e) }))}
        groupLabel={(exId) => grupos.etiqueta.get(exId) ?? null}
        onClose={() => setReordenando(false)}
        onSave={reordenarEjercicios}
      />

      <GlossarySheet termId={termino} onClose={() => setTermino(null)} />

      <VariantSheet
        visible={varianteDe !== null}
        base={(() => {
          const set = varianteDe ? seriePorId.get(varianteDe.setId) : undefined;
          const ex = set ? ejercicioDe(set) : null;
          return ex?.exercise_id ? porId.get(ex.exercise_id) ?? null : null;
        })()}
        catalog={catalogo.data ?? []}
        currentId={varianteDe ? seriePorId.get(varianteDe.setId)?.segments[varianteDe.segmentIndex]?.variant_exercise_id ?? null : null}
        onClose={() => setVarianteDe(null)}
        onPick={(variantId) => varianteDe && ponerVariante(varianteDe.setId, varianteDe.segmentIndex, variantId)}
        onSearchAll={() => {
          if (varianteDe) setSelector({ modo: 'variante', ...varianteDe });
          setVarianteDe(null);
        }}
      />

      <SetDetailsSheet visible={detallesDe !== null} set={detallesDe} unit={unit} onClose={() => setDetallesDe(null)} onSave={guardar} />

      <GroupSheet
        visible={agruparDesde !== null}
        from={agruparDesde ? { ...agruparDesde, name: nombreDe(agruparDesde) } : null}
        candidates={ejercicios
          .filter((e) => e.id !== agruparDesde?.id && !(e.group_id && grupos.porId.has(e.group_id)))
          .map((e) => ({ ...e, name: nombreDe(e) }))}
        onClose={() => setAgruparDesde(null)}
        onCreate={(input) => mutations.createGroup.mutate({ workoutId: data.id, input }, { onSuccess: () => void sesion.refetch() })}
      />

      <Sheet visible={protocoloPara !== null} onClose={() => setProtocoloPara(null)} title={w.protocolTitle}>
        <AppText variant="caption" color="textSecondary">
          {w.protocolIntro}
        </AppText>
        {PROTOCOLS.map((pr) => (
          <ActionRow
            key={pr.key}
            icon={<ListOrdered size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
            label={`${tx.training.protocols[pr.key].label} — ${tx.training.protocols[pr.key].description}`}
            onPress={() => {
              if (protocoloPara) aplicarProtocolo(protocoloPara, pr.key);
              setProtocoloPara(null);
            }}
          />
        ))}
      </Sheet>

      <IntervalTimerSheet
        visible={timerPara !== null}
        title={timerPara?.protocol ? protocolLabel(timerPara.protocol, lang) : w.timer}
        config={timerPara?.protocol ? protocolTimer(timerPara.protocol as ProtocolKey) : null}
        onClose={() => setTimerPara(null)}
      />

      <ExercisePicker
        visible={selector !== null}
        onClose={() => setSelector(null)}
        onPick={(elegido) => {
          if (!selector) return;
          if (selector.modo === 'variante') {
            ponerVariante(selector.setId, selector.segmentIndex, elegido.id);
            return;
          }
          if (selector.modo === 'cambiar') {
            // Cambiar de ejercicio conserva sus series (RF-F39).
            mutations.updateExercise.mutate({ id: selector.exercise.id, patch: { name: elegido.name_es, exercise_id: elegido.id } }, { onSuccess: () => void sesion.refetch() });
          } else {
            const posicion = ejercicios.reduce((m, e) => Math.max(m, e.position), -1) + 1;
            mutations.addExercise.mutate({
              workoutId: data.id,
              input: { name: elegido.name_es, exercise_id: elegido.id, position: posicion, sets: null, reps: null, weight: null, duration_minutes: null, notes: null },
            });
          }
        }}
      />

      <ToolsSheet
        visible={herramientasDe !== null}
        onClose={() => setHerramientasDe(null)}
        unit={unit}
        formula={formula}
        topWeight={pesoMaximo(herramientasDe, unit)}
        onAddWarmup={herramientasDe && editing ? (pasos) => agregarCalentamiento(herramientasDe, pasos) : undefined}
      />

      {resumen ? (
        <SessionSummarySheet
          visible={resumenAbierto}
          workout={data}
          summary={resumen}
          catalog={porId}
          unit={unit}
          onClose={() => {
            setResumenAbierto(false);
            close();
          }}
        />
      ) : null}

      <DatePickerSheet
        visible={pickingDate}
        value={fromIso(data.performed_at)}
        onClose={() => setPickingDate(false)}
        onSelect={(date) => {
          const current = fromIso(data.performed_at);
          const next = new Date(date);
          next.setHours(current.getHours(), current.getMinutes(), 0, 0);
          mutations.update.mutate({ id: data.id, patch: { performed_at: toIso(next), ...marcarEditado() } });
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
                showSnackbar({ message: w.duplicated });
                router.replace({ pathname: '/(app)/workout/[id]', params: { id: created.id } });
              },
            },
          );
        }}
      />
    </View>
  );
}

/** El peso más alto de un ejercicio en la sesión, en la unidad de la persona. */
function pesoMaximo(exercise: WorkoutExerciseDetail | null, unit: 'kg' | 'lb'): number | null {
  if (!exercise) return null;
  const max = Math.max(0, ...exercise.workout_sets.flatMap((s) => s.segments.map((g) => g.weight_kg ?? 0)));
  return max > 0 ? round(fromKg(max, unit), 1) : null;
}

/** Una escala de 1 a 5 con chips; tocar el valor elegido lo quita (RF-F49). */
function Escala({ titulo, valor, onChange }: { titulo: string; valor: number | null; onChange: (v: number | null) => void }) {
  const w = useT().fitness.workout;
  return (
    <View style={styles.escala}>
      <AppText variant="label" color="textSecondary" style={styles.escalaTitulo}>
        {titulo}
      </AppText>
      <View style={styles.chips}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} compact label={String(n)} accessibilityLabel={w.scaleA11y(titulo, n)} selected={valor === n} onPress={() => onChange(valor === n ? null : n)} />
        ))}
      </View>
    </View>
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
  const lang = useLanguage();
  const w = useT().fitness.workout;
  const range = useMemo(() => ({ from: startOfDay(new Date()), to: addDays(startOfDay(new Date()), 30) }), []);
  const activities = useActivitiesRange(range);
  const workouts = useWorkouts();
  const taken = new Set((workouts.data ?? []).map((w) => w.activity_id).filter(Boolean));
  const candidates = (activities.data ?? []).filter((a) => a.is_gym && !taken.has(a.id) && !a.owner_name);

  return (
    <Sheet visible={visible} onClose={onClose} title={w.duplicateIn}>
      <SwitchRow label={w.keepValues} hint={w.keepValuesHint} value={keepValues} onValueChange={onKeepValuesChange} />
      <AppText variant="label" color="textSecondary">
        {w.upcomingGym}
      </AppText>
      {candidates.length === 0 ? <AppText color="textSecondary">{w.noUpcomingGym}</AppText> : null}
      {candidates.map((a) => (
        <Button
          key={a.id}
          title={`${a.title} · ${formatShortDate(fromIso(a.start_at), lang)} ${formatTime(fromIso(a.start_at), lang)}`}
          variant="secondary"
          onPress={() => onPick({ activityId: a.id, performedAt: a.start_at })}
        />
      ))}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <Button title={w.freeNow} onPress={() => onPick({ activityId: null, performedAt: new Date().toISOString() })} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  headerCard: { padding: Spacing.lg, borderRadius: Radius.lg, borderCurve: 'continuous', gap: Spacing.md },
  camposFila: { flexDirection: 'row', gap: Spacing.sm },
  flex: { flex: 1 },
  section: { gap: Spacing.md },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.lg, gap: Spacing.sm, paddingBottom: 96 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.xs },
  timer: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  historia: { flexDirection: 'row' },
  escala: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  escalaTitulo: { width: 64 },
});
