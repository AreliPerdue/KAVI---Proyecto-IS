import { Check, ChevronRight, Copy, Ellipsis, Plus, Timer, Trash2, X } from 'lucide-react-native';
import { memo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { AppText, IconButton } from '@/components/ui';
import { MUSCLES } from '@/constants/exercise-catalog';
import { intensifierLabel } from '@/constants/intensifiers';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PrKind } from '@/lib/gym/records';
import { formatDuration, formatSegment, isImbalanced, segmentFieldValue, type SegmentField } from '@/lib/gym/sets';
import type { EffortScale } from '@/store/gym-store';
import type { Exercise, SetType, WeightUnit, WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';

/** Lo que se edita con el teclado: un campo de un segmento, o el esfuerzo de la serie. */
export type EditTarget = { setId: string; segmentIndex: number; field: SegmentField | 'effort' };

const ETIQUETA_TIPO: Partial<Record<SetType, string>> = {
  warmup: 'C',
  feeder: 'A',
  top_set: 'T',
  backoff: 'B',
  failure: 'F',
  amrap: 'M',
  technique: 'Té',
  max_test: '1RM',
};

const NOMBRE_SEGMENTO: Record<string, string> = {
  drop: 'drop',
  rest_pause: 'pausa',
  myo_activation: 'activación',
  myo_mini: 'mini',
  cluster: 'cluster',
  forced: 'forzadas',
  negative: 'negativa',
  partials: 'parciales',
  iso_hold: 'isométrico',
  loaded_stretch: 'estiramiento',
  twenty_ones_bottom: '21s abajo',
  twenty_ones_top: '21s arriba',
  twenty_ones_full: '21s completas',
  bfr: 'BFR',
};

const NOMBRE_PR: Record<PrKind, string> = {
  max_weight: 'peso',
  reps_at_weight: 'reps',
  e1rm: 'e1RM',
  set_volume: 'volumen',
};

export function columnLabel(field: SegmentField, unit: WeightUnit): string {
  switch (field) {
    case 'weight_kg':
      return unit;
    case 'reps':
      return 'Reps';
    case 'reps_left':
      return 'I';
    case 'reps_right':
      return 'D';
    case 'duration_sec':
      return 'Tiempo';
    case 'distance_m':
      return 'm';
    default:
      return '';
  }
}

function valorCelda(set: WorkoutSet, segmentIndex: number, field: SegmentField, unit: WeightUnit): string {
  const seg = set.segments[segmentIndex];
  if (!seg) return '–';
  const v = segmentFieldValue(seg, field, unit);
  if (v === null) return '–';
  return field === 'duration_sec' ? formatDuration(v) : String(v);
}

export type ExerciseBlockProps = {
  exercise: WorkoutExerciseDetail;
  catalog: Exercise | null;
  columns: SegmentField[];
  previous: WorkoutSet[];
  prs: Map<string, PrKind[]>;
  pendientes: ReadonlySet<string>;
  unit: WeightUnit;
  effortScale: EffortScale;
  editable: boolean;
  /** Texto de v1 que no se pudo convertir sin adivinar (RF-F62). */
  legacyNote: string | null;
  /** "A1", "B2"… si el ejercicio está en una agrupación (RF-F45). */
  groupLabel: string | null;
  /** Nombre del protocolo aplicado, si hay (RF-F46). */
  protocolLabel: string | null;
  /** Abre el timer de intervalos del protocolo (EMOM, Tabata…). */
  onOpenTimer?: (exercise: WorkoutExerciseDetail) => void;
  onAddSet: (exercise: WorkoutExerciseDetail) => void;
  onEdit: (target: EditTarget) => void;
  onToggle: (exercise: WorkoutExerciseDetail, set: WorkoutSet) => void;
  onCopyPrevious: (set: WorkoutSet, previous: WorkoutSet) => void;
  onSetMenu: (exercise: WorkoutExerciseDetail, set: WorkoutSet) => void;
  onDuplicate: (exercise: WorkoutExerciseDetail, set: WorkoutSet) => void;
  onDelete: (exercise: WorkoutExerciseDetail, set: WorkoutSet) => void;
  onRemoveSegment: (set: WorkoutSet, segmentIndex: number) => void;
  onExerciseMenu: (exercise: WorkoutExerciseDetail) => void;
  onOpenDetail: (exercise: WorkoutExerciseDetail) => void;
};

/**
 * Un ejercicio en el logger: encabezado, tabla de series y "+ Serie" (RF-F27 – RF-F33).
 *
 * Registrar una serie normal cuesta dos toques o menos: las series nacen prellenadas con
 * la anterior, así que si se repite basta con ✓; y si no, "Anterior" la copia de un toque.
 * Todo lo demás (drops, parciales, tipo de serie) vive en el menú de la fila, fuera del
 * camino del registro en vivo.
 */
export const ExerciseBlock = memo(function ExerciseBlock(props: ExerciseBlockProps) {
  const { exercise, catalog, columns, previous, prs, pendientes, unit, effortScale, editable, legacyNote, groupLabel, protocolLabel } = props;
  const theme = useTheme();
  const sets = exercise.workout_sets;
  // El calentamiento no cuenta: la "serie 1" es la primera efectiva.
  const etiquetas: string[] = [];
  let numero = 0;
  for (const s of sets) {
    if (s.set_type !== 'warmup') numero += 1;
    etiquetas.push(ETIQUETA_TIPO[s.set_type] ?? String(numero));
  }

  const musculos = catalog?.primary_muscles.slice(0, 2).map((m) => (MUSCLES as Record<string, string>)[m] ?? m).join(', ');

  return (
    <View style={[styles.bloque, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.encabezado}>
        {groupLabel ? (
          <View style={[styles.grupo, { backgroundColor: theme.ink }]} accessibilityLabel={`Agrupación ${groupLabel}`}>
            <AppText variant="label" color="onInk">
              {groupLabel}
            </AppText>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={catalog ? `Ver el progreso de ${exercise.name}` : exercise.name}
          disabled={!catalog}
          onPress={() => props.onOpenDetail(exercise)}
          style={({ pressed }) => [styles.titulo, pressed ? styles.pressed : null]}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {exercise.name || 'Ejercicio sin nombre'}
          </AppText>
          {musculos || protocolLabel ? (
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>
              {[protocolLabel, musculos].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
        </Pressable>
        {props.onOpenTimer ? (
          <IconButton label={`Timer de ${protocolLabel ?? 'intervalos'}`} onPress={() => props.onOpenTimer?.(exercise)}>
            <Timer size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        ) : null}
        {catalog ? <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} /> : null}
        {editable ? (
          <IconButton label={`Opciones de ${exercise.name}`} onPress={() => props.onExerciseMenu(exercise)}>
            <Ellipsis size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
          </IconButton>
        ) : null}
      </View>

      {exercise.notes ? (
        <AppText variant="caption" color="textSecondary">
          {exercise.notes}
        </AppText>
      ) : null}
      {legacyNote ? (
        <View style={[styles.legado, { backgroundColor: theme.surfaceAlt }]}>
          <AppText variant="caption" color="textSecondary">
            {legacyNote}
          </AppText>
        </View>
      ) : null}

      {sets.length > 0 ? (
        <View style={styles.filaCabecera}>
          <AppText variant="micro" color="textTertiary" style={styles.colNumero}>
            #
          </AppText>
          <AppText variant="micro" color="textTertiary" style={styles.colAnterior}>
            Anterior
          </AppText>
          {columns.map((c) => (
            <AppText key={c} variant="micro" color="textTertiary" style={c === 'weight_kg' || c === 'duration_sec' || c === 'distance_m' ? styles.colAncha : styles.colCorta}>
              {columnLabel(c, unit)}
            </AppText>
          ))}
          <AppText variant="micro" color="textTertiary" style={styles.colCorta}>
            {effortScale === 'rir' ? 'RIR' : 'RPE'}
          </AppText>
          <View style={styles.colCheck} />
        </View>
      ) : null}

      {sets.map((set, i) => {
        const anterior = previous[i] ?? null;
        return (
          <FilaSerie
            key={set.id}
            {...props}
            set={set}
            etiqueta={etiquetas[i]}
            anterior={anterior}
            prsSerie={prs.get(set.id)}
            pendiente={pendientes.has(set.id)}
          />
        );
      })}

      {editable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Agregar serie a ${exercise.name}`}
          onPress={() => props.onAddSet(exercise)}
          style={({ pressed }) => [styles.agregar, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
          <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
          <AppText variant="label">Serie</AppText>
        </Pressable>
      ) : null}
    </View>
  );
});

type FilaProps = ExerciseBlockProps & {
  set: WorkoutSet;
  etiqueta: string;
  anterior: WorkoutSet | null;
  prsSerie: PrKind[] | undefined;
  pendiente: boolean;
};

function FilaSerie(p: FilaProps) {
  const theme = useTheme();
  const swipe = useRef<SwipeableMethods>(null);
  const { set, exercise, columns, unit, effortScale, editable } = p;
  const hecha = set.completed_at !== null;
  const esfuerzo = effortScale === 'rir' ? set.rir : set.rpe;
  const main = set.segments[0];
  const textoAnterior = p.anterior?.segments[0]
    ? formatSegment(p.anterior.segments[0], unit)
    : set.target?.reps_min
      ? `obj. ${set.target.reps_min}${set.target.reps_max && set.target.reps_max !== set.target.reps_min ? `–${set.target.reps_max}` : ''}`
      : '–';
  /** Lo que la serie tiene de especial, en una línea: "Drop set · tempo 3-1-X-0 · fallo". */
  const detalle = [
    ...set.intensifiers.map(intensifierLabel),
    set.tempo ? `tempo ${set.tempo}` : null,
    set.failure ? 'fallo' : null,
    set.load_mods?.added_kg ? `+${set.load_mods.added_kg} kg lastre` : null,
    set.spotter ? 'con spotter' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const celda = (segmentIndex: number, field: SegmentField) => (
    <Pressable
      key={`${segmentIndex}-${field}`}
      accessibilityRole="button"
      accessibilityLabel={`${columnLabel(field, unit)} de la serie ${p.etiqueta}: ${valorCelda(set, segmentIndex, field, unit)}`}
      disabled={!editable}
      onPress={() => p.onEdit({ setId: set.id, segmentIndex, field })}
      style={({ pressed }) => [
        field === 'weight_kg' || field === 'duration_sec' || field === 'distance_m' ? styles.colAncha : styles.colCorta,
        styles.celda,
        { backgroundColor: pressed ? theme.border : hecha ? 'transparent' : theme.surfaceAlt },
      ]}>
      <AppText variant="bodyStrong" tabular numberOfLines={1}>
        {valorCelda(set, segmentIndex, field, unit)}
      </AppText>
    </Pressable>
  );

  const contenido = (
    <View style={[styles.serie, { backgroundColor: hecha ? theme.surfaceAlt : theme.surface }]}>
      <View style={styles.fila}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Opciones de la serie ${p.etiqueta}`}
          disabled={!editable}
          onPress={() => p.onSetMenu(exercise, set)}
          style={[styles.colNumero, styles.numero]}>
          <AppText variant="label" color={set.set_type === 'working' ? 'text' : 'textSecondary'}>
            {p.etiqueta}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={p.anterior ? `Copiar lo anterior: ${textoAnterior}` : 'Sin registro anterior'}
          disabled={!editable || !p.anterior}
          onPress={() => p.anterior && p.onCopyPrevious(set, p.anterior)}
          style={styles.colAnterior}>
          <AppText variant="caption" color="textTertiary" numberOfLines={1} tabular>
            {textoAnterior}
          </AppText>
        </Pressable>

        {columns.map((c) => celda(0, c))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${effortScale === 'rir' ? 'RIR' : 'RPE'} de la serie ${p.etiqueta}`}
          disabled={!editable}
          onPress={() => p.onEdit({ setId: set.id, segmentIndex: 0, field: 'effort' })}
          style={({ pressed }) => [styles.colCorta, styles.celda, { backgroundColor: pressed ? theme.border : hecha ? 'transparent' : theme.surfaceAlt }]}>
          <AppText variant="label" color={esfuerzo === null ? 'textTertiary' : 'text'} tabular>
            {esfuerzo === null ? '–' : String(esfuerzo)}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hecha }}
          accessibilityLabel={hecha ? `Desmarcar la serie ${p.etiqueta}` : `Marcar hecha la serie ${p.etiqueta}`}
          disabled={!editable}
          hitSlop={6}
          onPress={() => p.onToggle(exercise, set)}
          style={styles.colCheck}>
          <View style={[styles.check, hecha ? { backgroundColor: theme.ink, borderColor: theme.ink } : { borderColor: theme.border }]}>
            {hecha ? <Check size={16} strokeWidth={3} color={theme.onInk} /> : null}
          </View>
        </Pressable>
      </View>

      {set.segments.slice(1).map((seg, j) => (
        <View key={seg.id} style={styles.fila}>
          <View style={styles.colNumero} />
          <AppText variant="caption" color="textSecondary" style={styles.colAnterior}>
            ↳ {NOMBRE_SEGMENTO[seg.kind] ?? seg.kind}
          </AppText>
          {columns.map((c) => celda(j + 1, c))}
          <View style={styles.colCorta} />
          {editable ? (
            <IconButton label={`Quitar ${NOMBRE_SEGMENTO[seg.kind] ?? 'segmento'}`} onPress={() => p.onRemoveSegment(set, j + 1)}>
              <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            </IconButton>
          ) : (
            <View style={styles.colCheck} />
          )}
        </View>
      ))}

      {(main?.partial_reps || main?.forced_reps || main?.cheat_reps || detalle || p.prsSerie || p.pendiente || (main && isImbalanced(main))) ? (
        <View style={styles.extras}>
          {detalle ? (
            <AppText variant="micro" color="textSecondary">
              {detalle}
            </AppText>
          ) : null}
          {main?.forced_reps ? (
            <AppText variant="micro" color="textSecondary">
              + {main.forced_reps} forzadas
            </AppText>
          ) : null}
          {main?.cheat_reps ? (
            <AppText variant="micro" color="textSecondary">
              + {main.cheat_reps} con trampa
            </AppText>
          ) : null}
          {main?.partial_reps ? (
            <AppText variant="micro" color="textSecondary">
              + {main.partial_reps} parciales
            </AppText>
          ) : null}
          {main && isImbalanced(main) ? (
            <AppText variant="micro" color="today">
              Desbalance I/D
            </AppText>
          ) : null}
          {p.prsSerie ? (
            <View style={[styles.pr, { backgroundColor: theme.ink }]}>
              <AppText variant="micro" color="onInk">
                PR {p.prsSerie.map((k) => NOMBRE_PR[k]).join(' · ')}
              </AppText>
            </View>
          ) : null}
          {p.pendiente ? (
            <AppText variant="micro" color="textTertiary">
              Guardando…
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (!editable) return contenido;

  /*
   * Deslizar a la izquierda borra (con deshacer) y a la derecha duplica (RF-F33). En web
   * se desactiva: arrastrar con el mouse se confunde con hacer clic en las celdas. Ahí las
   * dos acciones están en el menú de la fila, que se abre tocando el número.
   */
  return (
    <ReanimatedSwipeable
      ref={swipe}
      friction={2}
      leftThreshold={80}
      rightThreshold={80}
      overshootLeft={false}
      overshootRight={false}
      enabled={Platform.OS !== 'web'}
      renderLeftActions={() => (
        <View style={[styles.accion, styles.accionIzq, { backgroundColor: theme.surfaceAlt }]}>
          <Copy size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
          <AppText variant="caption">Duplicar</AppText>
        </View>
      )}
      renderRightActions={() => (
        <View style={[styles.accion, styles.accionDer, { backgroundColor: theme.danger }]}>
          <AppText variant="caption" color="onInk">
            Borrar
          </AppText>
          <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.onInk} />
        </View>
      )}
      onSwipeableOpen={(direction) => {
        swipe.current?.close();
        // "left" = se abrieron las acciones de la izquierda, es decir, se deslizó a la derecha.
        if (String(direction) === 'left') p.onDuplicate(exercise, set);
        else p.onDelete(exercise, set);
      }}>
      {contenido}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  grupo: { minWidth: 32, height: 26, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, borderCurve: 'continuous' },
  bloque: { padding: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous', gap: Spacing.xs },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  titulo: { flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' },
  legado: { padding: Spacing.sm, borderRadius: Radius.sm, borderCurve: 'continuous' },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: Spacing.xs },
  serie: { borderRadius: Radius.sm, borderCurve: 'continuous', paddingVertical: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48 },
  colNumero: { width: 30, textAlign: 'center' },
  numero: { height: 44, alignItems: 'center', justifyContent: 'center' },
  colAnterior: { flex: 1, minWidth: 48 },
  colAncha: { width: 64, textAlign: 'center' },
  colCorta: { width: 46, textAlign: 'center' },
  colCheck: { width: 44, alignItems: 'center', justifyContent: 'center' },
  celda: { height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, borderCurve: 'continuous' },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  extras: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm, paddingLeft: 34, paddingBottom: 4 },
  pr: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 44,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },
  accion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, borderRadius: Radius.sm },
  accionIzq: { justifyContent: 'flex-start' },
  accionDer: { justifyContent: 'flex-end' },
  pressed: { opacity: 0.75 },
});
