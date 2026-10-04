import { useQueries } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown, ArrowUp, CalendarDays, Clock, Copy, Link2, ListOrdered, Merge, Pencil, Plus, Redo2, Repeat2, Scale, Scissors, SlidersHorizontal, Sparkles, Timer, Trash2, Undo2, Unlink, Wrench, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { type EditTarget, ExerciseBlock, columnLabel } from '@/components/fitness/exercise-block';
import { ExercisePicker } from '@/components/fitness/exercise-picker';
import { GroupSheet } from '@/components/fitness/group-sheet';
import { IntensifierSheet } from '@/components/fitness/intensifier-sheet';
import { IntervalTimerSheet } from '@/components/fitness/interval-timer-sheet';
import { SetDetailsSheet } from '@/components/fitness/set-details-sheet';
import { NumpadSheet, type NumpadField } from '@/components/fitness/numpad-sheet';
import { RestTimerBar } from '@/components/fitness/rest-timer-bar';
import { ToolsSheet } from '@/components/fitness/tools-sheet';
import { ModalHeader } from '@/components/modal-header';
import { ActionRow, AppText, Banner, Button, Chip, DatePickerSheet, ErrorState, FieldButton, IconButton, LoadingState, Screen, Sheet, SwitchRow, TextField, TimePickerSheet } from '@/components/ui';
import { PROTOCOLS, type ProtocolKey } from '@/constants/intensifiers';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useActivitiesRange } from '@/hooks/use-activities-range';
import { useEditHistory } from '@/hooks/use-edit-history';
import { exerciseHistoryQuery, useLegacyConversion } from '@/hooks/use-exercise-history';
import { useExercises } from '@/hooks/use-exercises';
import { useSessionDetail, useSetActions } from '@/hooks/use-set-sync';
import { useTheme } from '@/hooks/use-theme';
import { useWorkoutMutations, useWorkouts } from '@/hooks/use-workouts';
import { formatDate, formatShortDate, formatTime, fromIso, startOfDay, toIso } from '@/lib/dates';
import { success, tap } from '@/lib/haptics';
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
  segmentFieldValue,
  setSegmentField,
  sortOrderBetween,
  splitSet,
  type SegmentField,
} from '@/lib/gym/sets';
import type { WarmupStep } from '@/lib/gym/tools';
import { applyIntensifier, protocolRestSec, protocolSets, protocolTimer, removeIntensifier } from '@/lib/gym/transforms';
import { formatWeight, fromKg, round, toKg } from '@/lib/gym/units';
import { useAuth, useConfirm, useSnackbar } from '@/providers';
import type { ExerciseHistoryEntry } from '@/services/workouts';
import { useGymStore } from '@/store/gym-store';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Exercise, SetType, WorkoutExercise, WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';

const MAX_WIDTH = 640;

const TIPOS: { value: SetType; label: string }[] = [
  { value: 'warmup', label: 'Calentamiento' },
  { value: 'feeder', label: 'Aproximación' },
  { value: 'working', label: 'Efectiva' },
  { value: 'top_set', label: 'Top set' },
  { value: 'backoff', label: 'Back-off' },
  { value: 'failure', label: 'Al fallo' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'technique', label: 'Técnica' },
  { value: 'max_test', label: 'Test de máximo' },
];

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
  const confirm = useConfirm();
  const showSnackbar = useSnackbar();
  const { userId } = useAuth();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'view' | 'edit' }>();
  useLegacyConversion();
  const sesion = useSessionDetail(id);
  const { saveSet: enviarSerie, removeSet: retirarSerie } = useSetActions(id);
  const mutations = useWorkoutMutations();
  const catalogo = useExercises();
  const unit = useGymStore((s) => s.weightUnit);
  const effortScale = useGymStore((s) => s.effortScale);
  const formula = useGymStore((s) => s.e1rmFormula);
  const restDefault = useGymStore((s) => s.restDefaultSec);
  const dropPercent = useGymStore((s) => s.dropPercent);
  const startRest = useGymStore((s) => s.startRest);
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
  const [selector, setSelector] = useState<{ modo: 'agregar' } | { modo: 'cambiar'; exercise: WorkoutExercise } | null>(null);
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
      const parse = hasLegacyText(e) ? parseLegacy(e) : null;
      const legacyNote =
        parse?.ambiguous && e.legacy_converted_at
          ? `Texto original: ${[e.sets ? `${e.sets} series` : null, e.reps, e.weight].filter(Boolean).join(' · ')}. ${parse.reasons[0] ?? ''}`
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
  }, [ejercicios, porId, historialDe, id, data?.bodyweight_kg, formula]);

  // Un PR nuevo vibra (Android). Se compara contra el total anterior para no vibrar al abrir.
  const totalPRs = useMemo(() => [...analisis.values()].reduce((n, a) => n + a.prs.size, 0), [analisis]);
  const prsPrevios = useRef<number | null>(null);
  useEffect(() => {
    if (prsPrevios.current !== null && totalPRs > prsPrevios.current) success();
    prsPrevios.current = totalPRs;
  }, [totalPRs]);

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

  const close = () => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/fitness'));

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
            showSnackbar({ message: `Sigue: ${grupos.etiqueta.get(siguienteEj.id) ?? ''} ${siguienteEj.name}` });
            return;
          }
          startRest(id, grupo.rest_after_round_sec ?? exercise.rest_target_sec ?? restDefault, `${grupos.etiqueta.get(miembros[0].id) ?? ''} ${miembros[0].name}, siguiente ronda`);
          return;
        }
        const indice = exercise.workout_sets.findIndex((s) => s.id === set.id);
        const siguiente = exercise.workout_sets[indice + 1];
        const etiqueta = siguiente ? `${exercise.name}, serie ${indice + 2}` : exercise.name;
        startRest(id, exercise.rest_target_sec ?? restDefault, etiqueta);
      }
    },
    [guardar, data?.status, startRest, id, restDefault, grupos, ejercicios, showSnackbar],
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
      showSnackbar({ message: 'Serie borrada.', actionLabel: 'Deshacer', onAction: () => guardar(set) });
    },
    [quitar, guardar, showSnackbar],
  );

  /** Unir dos series en una: la segunda pasa a ser tramo de la primera (RF-F39). */
  const unir = (a: WorkoutSet, b: WorkoutSet, kind: 'drop' | 'rest_pause') =>
    historia.batch(() => {
      guardar(mergeSets(a, b, kind));
      quitar(b.id);
    });

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
    const orden: (SegmentField | 'effort')[] = [...(analisis.get(ex?.id ?? '')?.columns ?? []), 'effort'];
    const i = orden.indexOf(teclado.target.field);
    const proximo = orden[i + 1];
    if (!proximo || teclado.target.segmentIndex > 0 || i < 0) return setTeclado(null);
    setTeclado({ target: { ...teclado.target, field: proximo }, draft: teclado.draft });
  };

  const campoTeclado = useMemo((): NumpadField | null => {
    if (!teclado) return null;
    const { draft, target } = teclado;
    const ex = ejercicioDe(draft);
    const numero = (ex?.workout_sets.findIndex((s) => s.id === draft.id) ?? 0) + 1;
    const prefijo = `${ex?.name ?? 'Serie'} · serie ${numero}${target.segmentIndex > 0 ? ` (tramo ${target.segmentIndex + 1})` : ''}`;
    if (target.field === 'effort') {
      const rir = effortScale === 'rir';
      return { title: `${prefijo} · ${rir ? 'RIR' : 'RPE'}`, value: rir ? draft.rir : draft.rpe, step: rir ? 1 : 0.5, decimals: !rir, min: rir ? 0 : 1, max: 10 };
    }
    const seg = draft.segments[target.segmentIndex];
    const valor = seg ? segmentFieldValue(seg, target.field, unit) : null;
    switch (target.field) {
      case 'weight_kg':
        return { title: `${prefijo} · Peso`, value: valor, step: unit === 'kg' ? 2.5 : 5, decimals: true, suffix: unit };
      case 'duration_sec':
        return { title: `${prefijo} · Tiempo`, value: valor, step: 15, decimals: false, suffix: 's' };
      case 'distance_m':
        return { title: `${prefijo} · Distancia`, value: valor, step: 100, decimals: false, suffix: 'm' };
      case 'partial_reps':
        return { title: `${prefijo} · Parciales`, value: valor, step: 1, decimals: false, counter: true };
      case 'forced_reps':
        return { title: `${prefijo} · Reps forzadas`, value: valor, step: 1, decimals: false, counter: true };
      case 'cheat_reps':
        return { title: `${prefijo} · Reps con trampa`, value: valor, step: 1, decimals: false, counter: true };
      default:
        return { title: `${prefijo} · ${columnLabel(target.field, unit)}`, value: valor, step: 1, decimals: false, counter: true, max: 999 };
    }
  }, [teclado, ejercicioDe, effortScale, unit]);

  const cambiarValor = (valor: number | null) => {
    if (!teclado) return;
    const { draft, target } = teclado;
    const siguiente =
      target.field === 'effort'
        ? { ...draft, [effortScale]: valor }
        : setSegmentField(draft, target.segmentIndex, target.field, valor, unit);
    setTeclado({ target, draft: siguiente });
  };

  // ── Acciones de ejercicio ────────────────────────────────────────────────────────────

  /** Borrado suave: deshacer restaura el mismo ejercicio con sus series (RF-F6). */
  const deleteExercise = (exercise: WorkoutExercise) => {
    mutations.removeExercise.mutate(exercise.id, {
      onSuccess: () =>
        showSnackbar({
          message: `"${exercise.name || 'Ejercicio'}" eliminado.`,
          actionLabel: 'Deshacer',
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
    const ok = await confirm({ title: 'Descartar sesión', message: 'No contará en tu historial ni en tus récords.', confirmLabel: 'Descartar', destructive: true });
    if (!ok) return;
    useGymStore.getState().stopRest();
    mutations.update.mutate({ id: data.id, patch: { status: 'discarded' } }, { onSuccess: close });
  };

  const deleteWorkout = async () => {
    if (!data) return;
    const ok = await confirm({ title: 'Eliminar entrenamiento', message: 'Se borrarán sus ejercicios y series.', confirmLabel: 'Eliminar', destructive: true });
    if (!ok) return;
    mutations.remove.mutate(data.id, { onSuccess: () => { showSnackbar({ message: 'Entrenamiento eliminado.' }); close(); } });
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
        <ModalHeader title="Entrenamiento" />
        <LoadingState />
      </Screen>
    );
  }
  if (sesion.isError || !data) {
    return (
      <Screen modal maxWidth={MAX_WIDTH}>
        <ModalHeader title="Entrenamiento" />
        <ErrorState message={sesion.error?.message ?? 'Ese entrenamiento ya no existe.'} onRetry={() => sesion.refetch()} />
      </Screen>
    );
  }

  const enCurso = data.status === 'active';
  const siguienteDeMenu = menuSerie
    ? menuSerie.exercise.workout_sets[menuSerie.exercise.workout_sets.findIndex((s) => s.id === menuSerie.set.id) + 1] ?? null
    : null;
  const notesValue = notes ?? data.notes ?? '';
  const titleValue = title ?? data.title ?? '';
  const encabezado = data.title || data.activity_title || 'Entrenamiento libre';
  const minutos = enCurso ? Math.max(0, Math.round((ahora - fromIso(data.performed_at).getTime()) / 60_000)) : null;
  /** Editar una sesión ya terminada la marca como editada (RF-F42); en vivo, no. */
  const marcarEditado = () => (enCurso ? {} : { edited_at: new Date().toISOString() });
  /** Duración de una sesión terminada: de que empezó a que se marcó terminada. */
  const duracionMin = data.ended_at ? Math.max(1, Math.round((fromIso(data.ended_at).getTime() - fromIso(data.performed_at).getTime()) / 60_000)) : null;

  return (
    <View style={styles.raiz}>
      <Screen modal scroll maxWidth={MAX_WIDTH}>
        <ModalHeader
          title={enCurso ? 'Sesión en curso' : 'Entrenamiento'}
          right={
            editing ? (
              <View style={styles.historia}>
                <IconButton label="Deshacer" onPress={historia.undo} disabled={!historia.canUndo}>
                  <Undo2 size={IconSize.action} strokeWidth={IconStroke} color={historia.canUndo ? theme.text : theme.textTertiary} />
                </IconButton>
                <IconButton label="Rehacer" onPress={historia.redo} disabled={!historia.canRedo}>
                  <Redo2 size={IconSize.action} strokeWidth={IconStroke} color={historia.canRedo ? theme.text : theme.textTertiary} />
                </IconButton>
              </View>
            ) : (
              <Button title="Editar" variant="ghost" icon={<Pencil size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setEditing(true)} />
            )
          }
        />

        {mutations.update.error || mutations.addExercise.error ? (
          <Banner tone="error" message={(mutations.update.error ?? mutations.addExercise.error)?.message ?? ''} />
        ) : null}

        <View style={[styles.headerCard, { backgroundColor: theme.surfaceAlt }]}>
          {editing ? (
            <TextField
              label="Nombre"
              value={titleValue}
              onChangeText={setTitle}
              onBlur={() => {
                const limpio = titleValue.trim();
                if (limpio === (data.title ?? '')) return;
                mutations.update.mutate({ id: data.id, patch: { title: limpio || null } }, { onSuccess: () => { if (limpio) setLastWorkoutTitle(limpio); } });
              }}
              placeholder={data.activity_title ?? 'Pierna, empuje A…'}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          ) : (
            <AppText variant="heading">{encabezado}</AppText>
          )}
          <AppText color="textSecondary">
            {formatDate(fromIso(data.performed_at))}
            {minutos !== null ? ` · ${minutos} min en curso` : data.edited_at ? ' · editado' : ''}
          </AppText>
          {editing ? (
            <View style={styles.camposFila}>
              <View style={styles.flex}>
                <FieldButton
                  label="Fecha"
                  value={formatShortDate(fromIso(data.performed_at))}
                  onPress={() => setPickingDate(true)}
                  leading={<CalendarDays size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                />
              </View>
              <View style={styles.flex}>
                <FieldButton
                  label="Peso corporal"
                  value={data.bodyweight_kg ? formatWeight(data.bodyweight_kg, unit) : null}
                  placeholder="Opcional"
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
                  label="Hora"
                  value={formatTime(fromIso(data.performed_at))}
                  onPress={() => setHoraAbierta(true)}
                  leading={<Clock size={IconSize.inline} strokeWidth={IconStroke} color={theme.textSecondary} />}
                />
              </View>
              <View style={styles.flex}>
                <FieldButton
                  label="Duración"
                  value={duracionMin !== null ? `${duracionMin} min` : null}
                  placeholder="Sin registrar"
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
            <TextField
              label="Notas generales"
              value={notesValue}
              onChangeText={setNotes}
              onBlur={() => mutations.update.mutate({ id: data.id, patch: { notes: notesValue.trim() || null } })}
              placeholder="Cómo te sentiste, qué cambiar…"
              multiline
            />
          ) : data.notes ? (
            <AppText>{data.notes}</AppText>
          ) : null}
        </View>

        <View style={styles.section}>
          {ejercicios.length === 0 ? (
            <AppText color="textSecondary">{editing ? 'Agrega tu primer ejercicio.' : 'Sin ejercicios registrados.'}</AppText>
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
                protocolLabel={PROTOCOLS.find((x) => x.key === exercise.protocol)?.label ?? null}
                onOpenTimer={exercise.protocol && protocolTimer(exercise.protocol as ProtocolKey) ? setTimerPara : undefined}
                onAddSet={agregarSerie}
                onEdit={abrirTeclado}
                onToggle={alternar}
                onCopyPrevious={copiarAnterior}
                onSetMenu={(ex, set) => setMenuSerie({ exercise: ex, set })}
                onDuplicate={duplicar}
                onDelete={borrarSerie}
                onRemoveSegment={quitarSegmento}
                onExerciseMenu={setMenuEjercicio}
                onOpenDetail={(ex) => {
                  if (ex.exercise_id) router.push({ pathname: '/(app)/exercise/[id]', params: { id: ex.exercise_id } });
                }}
              />
            );
          })}
          {editing ? (
            <Button
              title="Ejercicio"
              variant="secondary"
              icon={<Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />}
              loading={mutations.addExercise.isPending}
              onPress={() => setSelector({ modo: 'agregar' })}
            />
          ) : null}
        </View>

        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          {enCurso ? <Button title="Terminar sesión" onPress={terminar} /> : null}
          <Button title="Duplicar en…" variant="secondary" icon={<Copy size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />} onPress={() => setDuplicateOpen(true)} />
          {enCurso ? <Button title="Descartar sesión" variant="ghost" onPress={descartar} /> : null}
          {editing && !enCurso ? (
            <Button title="Eliminar entrenamiento" variant="danger" icon={<Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.danger} />} onPress={deleteWorkout} />
          ) : null}
          {editing && !enCurso ? <Button title="Listo" onPress={close} /> : null}
        </View>
      </Screen>

      <View style={styles.timer} pointerEvents="box-none">
        <RestTimerBar workoutId={data.id} />
      </View>

      <NumpadSheet visible={teclado !== null} field={campoTeclado} onChange={cambiarValor} onClose={cerrarTeclado} onNext={siguienteCampo} />

      <TimePickerSheet
        visible={horaAbierta}
        value={fromIso(data.performed_at).getHours() * 60 + fromIso(data.performed_at).getMinutes()}
        title="Hora de inicio"
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
        field={{ title: 'Duración de la sesión', value: duracion, step: 5, decimals: false, suffix: 'min', min: 1, max: 600 }}
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
        field={{ title: 'Peso corporal de hoy', value: pesoCorporal, step: unit === 'kg' ? 0.5 : 1, decimals: true, suffix: unit, min: 0, max: 400 }}
        onChange={setPesoCorporal}
        onClose={() => {
          setPesoCorporalAbierto(false);
          mutations.update.mutate({ id: data.id, patch: { bodyweight_kg: pesoCorporal ? toKg(pesoCorporal, unit) : null, ...marcarEditado() } });
        }}
      />

      <Sheet visible={menuSerie !== null} onClose={() => setMenuSerie(null)} title="Serie">
        {menuSerie ? (
          <>
            <AppText variant="label" color="textSecondary">
              Tipo de serie
            </AppText>
            <View style={styles.chips}>
              {TIPOS.map((t) => (
                <Chip
                  key={t.value}
                  compact
                  label={t.label}
                  selected={menuSerie.set.set_type === t.value}
                  onPress={() => {
                    guardar({ ...menuSerie.set, set_type: t.value });
                    setMenuSerie(null);
                  }}
                />
              ))}
            </View>
            <ActionRow
              icon={<Sparkles size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Intensificador…"
              onPress={() => {
                setIntensificadoresDe(menuSerie.set);
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<SlidersHorizontal size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Detalles: fallo, ROM, tempo, carga"
              onPress={() => {
                setDetallesDe(menuSerie.set);
                setMenuSerie(null);
              }}
            />
            {menuSerie.set.intensifiers.includes('forced_reps') ? (
              <ActionRow
                icon={<Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label="Reps forzadas"
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
                label="Reps con trampa"
                onPress={() => {
                  const set = menuSerie.set;
                  setMenuSerie(null);
                  setTeclado({ target: { setId: set.id, segmentIndex: 0, field: 'cheat_reps' }, draft: set });
                }}
              />
            ) : null}
            <ActionRow
              icon={<Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label={`+ Drop (−${dropPercent} %)`}
              onPress={() => {
                guardar(addDrop(menuSerie.set, dropPercent));
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<Repeat2 size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="+ Mini-serie (rest-pause)"
              onPress={() => {
                guardar(addMiniSet(menuSerie.set));
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<Plus size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Reps parciales"
              onPress={() => {
                const set = menuSerie.set;
                setMenuSerie(null);
                setTeclado({ target: { setId: set.id, segmentIndex: 0, field: 'partial_reps' }, draft: set });
              }}
            />
            {menuSerie.set.segments.length > 1 ? (
              <ActionRow
                icon={<Scissors size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label="Separar en series"
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
                  label="Unir con la siguiente como drop"
                  onPress={() => {
                    unir(menuSerie.set, siguienteDeMenu, 'drop');
                    setMenuSerie(null);
                  }}
                />
                <ActionRow
                  icon={<Merge size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                  label="Unir con la siguiente como rest-pause"
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
                  Mover a
                </AppText>
                <View style={styles.chips}>
                  {ejercicios
                    .filter((e) => e.id !== menuSerie.exercise.id)
                    .map((destino) => (
                      <Chip
                        key={destino.id}
                        compact
                        label={destino.name}
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
              label="Duplicar"
              onPress={() => {
                duplicar(menuSerie.exercise, menuSerie.set);
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<ArrowUp size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Subir"
              onPress={() => {
                const sets = menuSerie.exercise.workout_sets;
                const i = sets.findIndex((s) => s.id === menuSerie.set.id);
                if (i > 0) guardar({ ...menuSerie.set, sort_order: sortOrderBetween(sets[i - 2]?.sort_order ?? null, sets[i - 1].sort_order) });
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<ArrowDown size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Bajar"
              onPress={() => {
                const sets = menuSerie.exercise.workout_sets;
                const i = sets.findIndex((s) => s.id === menuSerie.set.id);
                if (i < sets.length - 1) guardar({ ...menuSerie.set, sort_order: sortOrderBetween(sets[i + 1].sort_order, sets[i + 2]?.sort_order ?? null) });
                setMenuSerie(null);
              }}
            />
            <ActionRow
              icon={<Trash2 size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label="Borrar serie"
              color="danger"
              onPress={() => {
                borrarSerie(menuSerie.exercise, menuSerie.set);
                setMenuSerie(null);
              }}
            />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={menuEjercicio !== null} onClose={() => setMenuEjercicio(null)} title={menuEjercicio?.name ?? 'Ejercicio'}>
        {menuEjercicio ? (
          <>
            <ActionRow
              icon={<Wrench size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Discos, calentamiento y 1RM"
              onPress={() => {
                setHerramientasDe(menuEjercicio);
                setMenuEjercicio(null);
              }}
            />
            {menuEjercicio.group_id && grupos.porId.has(menuEjercicio.group_id) ? (
              <ActionRow
                icon={<Unlink size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label="Desagrupar"
                onPress={() => {
                  if (menuEjercicio.group_id) mutations.removeGroup.mutate(menuEjercicio.group_id, { onSuccess: () => void sesion.refetch() });
                  setMenuEjercicio(null);
                }}
              />
            ) : (
              <ActionRow
                icon={<Link2 size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
                label="Agrupar como superserie, circuito…"
                onPress={() => {
                  setAgruparDesde(menuEjercicio);
                  setMenuEjercicio(null);
                }}
              />
            )}
            <ActionRow
              icon={<ListOrdered size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Aplicar protocolo…"
              onPress={() => {
                setProtocoloPara(menuEjercicio);
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<Repeat2 size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Cambiar ejercicio"
              onPress={() => {
                setSelector({ modo: 'cambiar', exercise: menuEjercicio });
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<ArrowUp size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Subir"
              onPress={() => {
                mover(menuEjercicio, -1);
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<ArrowDown size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
              label="Bajar"
              onPress={() => {
                mover(menuEjercicio, 1);
                setMenuEjercicio(null);
              }}
            />
            <ActionRow
              icon={<X size={IconSize.action} strokeWidth={IconStroke} color={theme.danger} />}
              label="Quitar ejercicio"
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
          setIntensificadoresDe(nueva);
        }}
      />

      <SetDetailsSheet visible={detallesDe !== null} set={detallesDe} unit={unit} onClose={() => setDetallesDe(null)} onSave={guardar} />

      <GroupSheet
        visible={agruparDesde !== null}
        from={agruparDesde}
        candidates={ejercicios.filter((e) => e.id !== agruparDesde?.id && !(e.group_id && grupos.porId.has(e.group_id)))}
        onClose={() => setAgruparDesde(null)}
        onCreate={(input) => mutations.createGroup.mutate({ workoutId: data.id, input }, { onSuccess: () => void sesion.refetch() })}
      />

      <Sheet visible={protocoloPara !== null} onClose={() => setProtocoloPara(null)} title="Aplicar protocolo">
        <AppText variant="caption" color="textSecondary">
          Genera las series con sus objetivos a partir de tu peso de trabajo. Las series pendientes de este ejercicio se reemplazan; las hechas se quedan.
        </AppText>
        {PROTOCOLS.map((pr) => (
          <ActionRow
            key={pr.key}
            icon={<ListOrdered size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />}
            label={`${pr.label} — ${pr.description}`}
            onPress={() => {
              if (protocoloPara) aplicarProtocolo(protocoloPara, pr.key);
              setProtocoloPara(null);
            }}
          />
        ))}
      </Sheet>

      <IntervalTimerSheet
        visible={timerPara !== null}
        title={PROTOCOLS.find((x) => x.key === timerPara?.protocol)?.label ?? 'Timer'}
        config={timerPara?.protocol ? protocolTimer(timerPara.protocol as ProtocolKey) : null}
        onClose={() => setTimerPara(null)}
      />

      <ExercisePicker
        visible={selector !== null}
        onClose={() => setSelector(null)}
        onPick={(elegido) => {
          if (!selector) return;
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

      <Sheet
        visible={resumenAbierto}
        onClose={() => {
          setResumenAbierto(false);
          close();
        }}
        title="Sesión terminada">
        {resumen ? (
          <>
            <View style={styles.resumen}>
              <Cifra valor={resumen.durationMin ? `${resumen.durationMin} min` : '—'} etiqueta="Duración" />
              <Cifra valor={formatWeight(resumen.volumeKg, unit)} etiqueta="Volumen" />
              <Cifra valor={String(resumen.setsDone)} etiqueta="Series" />
              <Cifra valor={String(resumen.prCount)} etiqueta="PRs" />
            </View>
            {resumen.setsPending > 0 ? (
              <AppText variant="caption" color="textTertiary">
                {resumen.setsPending} {resumen.setsPending === 1 ? 'serie quedó' : 'series quedaron'} sin marcar y no cuentan.
              </AppText>
            ) : null}
            <Button
              title="Listo"
              onPress={() => {
                setResumenAbierto(false);
                close();
              }}
            />
          </>
        ) : null}
      </Sheet>

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
                showSnackbar({ message: 'Entrenamiento duplicado.' });
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

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.cifra, { backgroundColor: theme.surfaceAlt }]}>
      <AppText variant="heading" tabular>
        {valor}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {etiqueta}
      </AppText>
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
  const range = useMemo(() => ({ from: startOfDay(new Date()), to: addDays(startOfDay(new Date()), 30) }), []);
  const activities = useActivitiesRange(range);
  const workouts = useWorkouts();
  const taken = new Set((workouts.data ?? []).map((w) => w.activity_id).filter(Boolean));
  const candidates = (activities.data ?? []).filter((a) => a.is_gym && !taken.has(a.id) && !a.owner_name);

  return (
    <Sheet visible={visible} onClose={onClose} title="Duplicar en…">
      <SwitchRow label="Conservar series y pesos" hint="Desactívalo para copiar solo la lista de ejercicios." value={keepValues} onValueChange={onKeepValuesChange} />
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
  resumen: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cifra: { flexBasis: '47%', flexGrow: 1, padding: Spacing.md, borderRadius: Radius.md, borderCurve: 'continuous', gap: 2 },
});
