import { Check, ChevronRight, Copy, Ellipsis, EllipsisVertical, MessageSquareText, Pin, Plus, Timer, Trash2, X } from 'lucide-react-native';
import { memo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AppText, type DragControls, IconButton, ReorderableColumn } from '@/components/ui';
import { IconSize, IconStroke, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { intensifierLabel, muscleName, segmentName, tagLabel, workoutExerciseName } from '@/lib/gym/display-names';
import type { PrKind } from '@/lib/gym/records';
import { formatDuration, formatSegment, isImbalanced, segmentFieldValue, type SegmentField } from '@/lib/gym/sets';
import type { EffortScale } from '@/store/gym-store';
import type { Exercise, SetSegment, WeightUnit, WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';
import { getLanguage, t, type Language, useLanguage, useT } from '@/i18n';

/**
 * En web no se puede deslizar una serie (RF-F33), así que duplicar y borrar llevan botones
 * visibles al final de cada fila. En una ventana angosta no caben los dos sin empujar fuera el
 * número de la serie: ahí va un solo "···" que abre el menú de la serie, donde están las dos.
 */
const ACCIONES_VISIBLES = Platform.OS === 'web';
const ANCHO_PARA_DOS_BOTONES = 600;

function useAccionesAnchas(): boolean {
  return useWindowDimensions().width >= ANCHO_PARA_DOS_BOTONES;
}

/** Lo que se edita con el teclado: un campo de un segmento, o el esfuerzo de la serie. */
export type EditTarget = { setId: string; segmentIndex: number; field: SegmentField | 'effort' };

export function columnLabel(field: SegmentField, unit: WeightUnit, lang: Language = getLanguage()): string {
  const tx = t(lang);
  switch (field) {
    case 'weight_kg':
      return unit;
    case 'reps':
      return tx.fitness.block.reps;
    case 'reps_left':
      return tx.training.left;
    case 'reps_right':
      return tx.training.right;
    case 'duration_sec':
      return tx.fitness.block.time;
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
  /** La nota fija del ejercicio: va arriba en cada sesión (RF-F52). */
  stickyNote: string | null;
  /** El badge de PR entra con una animación corta; en Modo serio, quieto (RF-F54, RF-F56). */
  celebrate: boolean;
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
  /** Arrastrar una serie a otra posición del mismo ejercicio (RF-F33). */
  onMoveSet: (exercise: WorkoutExerciseDetail, from: number, to: number) => void;
  /** Mientras se arrastra una serie, la pantalla no debe desplazarse. */
  onDragStateChange?: (dragging: boolean) => void;
  /** Elegir la variante del tramo de un drop mecánico (RF-F44). Sin él, solo se muestra. */
  onPickVariant?: (set: WorkoutSet, segmentIndex: number) => void;
  /** Abre la explicación de un término del glosario (RF-F64), p. ej. al tocar "RIR". */
  onExplain?: (termId: string) => void;
  /** Nombre de un ejercicio del catálogo, para mostrar la variante elegida. */
  exerciseName?: (exerciseId: string) => string | null;
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
  const { exercise, catalog, columns, previous, prs, pendientes, unit, effortScale, editable, legacyNote, groupLabel, protocolLabel, stickyNote } = props;
  const anchas = useAccionesAnchas();
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const b = tx.fitness.block;
  const nombre = workoutExerciseName(exercise.name, catalog, lang);
  const sets = exercise.workout_sets;
  // El calentamiento no cuenta: la "serie 1" es la primera efectiva.
  const etiquetas: string[] = [];
  let numero = 0;
  for (const s of sets) {
    if (s.set_type !== 'warmup') numero += 1;
    etiquetas.push(tx.training.setTypeShort[s.set_type] ?? String(numero));
  }

  const musculos = catalog?.primary_muscles.slice(0, 2).map((m) => muscleName(m, lang)).join(', ');

  return (
    <View style={[styles.bloque, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.encabezado}>
        {groupLabel ? (
          <View style={[styles.grupo, { backgroundColor: theme.ink }]} accessibilityLabel={b.group(groupLabel)}>
            <AppText variant="label" color="onInk">
              {groupLabel}
            </AppText>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={catalog ? b.seeProgress(nombre) : nombre}
          disabled={!catalog}
          onPress={() => props.onOpenDetail(exercise)}
          style={({ pressed }) => [styles.titulo, pressed ? styles.pressed : null]}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {nombre || b.unnamed}
          </AppText>
          {musculos || protocolLabel ? (
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>
              {[protocolLabel, musculos].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
        </Pressable>
        {props.onOpenTimer ? (
          <IconButton label={b.timerFor(protocolLabel)} onPress={() => props.onOpenTimer?.(exercise)}>
            <Timer size={IconSize.action} strokeWidth={IconStroke} color={theme.text} />
          </IconButton>
        ) : null}
        {catalog ? <ChevronRight size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} /> : null}
        {editable ? (
          <IconButton label={b.optionsFor(nombre)} onPress={() => props.onExerciseMenu(exercise)}>
            <Ellipsis size={IconSize.action} strokeWidth={IconStroke} color={theme.textSecondary} />
          </IconButton>
        ) : null}
      </View>

      {stickyNote ? (
        <View style={[styles.nota, { backgroundColor: theme.surfaceAlt }]} accessibilityLabel={b.pinnedNote(stickyNote)}>
          <Pin size={14} strokeWidth={IconStroke} color={theme.textSecondary} />
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            {stickyNote}
          </AppText>
        </View>
      ) : null}
      {exercise.notes ? (
        <View style={styles.nota} accessibilityLabel={b.exerciseNote(exercise.notes)}>
          <MessageSquareText size={14} strokeWidth={IconStroke} color={theme.textSecondary} />
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            {exercise.notes}
          </AppText>
        </View>
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
            {b.previous}
          </AppText>
          {columns.map((c) => (
            <AppText key={c} variant="micro" color="textTertiary" style={c === 'weight_kg' || c === 'duration_sec' || c === 'distance_m' ? styles.colAncha : styles.colCorta}>
              {columnLabel(c, unit, lang)}
            </AppText>
          ))}
          {props.onExplain ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={b.whatIs(effortScale === 'rir' ? 'RIR' : 'RPE')}
              hitSlop={8}
              onPress={() => props.onExplain?.(effortScale)}
              style={styles.colCorta}>
              {/* Subrayado punteado: la señal de "toca para saber qué es". */}
              <AppText variant="micro" color="textSecondary" style={styles.termino}>
                {effortScale === 'rir' ? 'RIR' : 'RPE'}
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="micro" color="textTertiary" style={styles.colCorta}>
              {effortScale === 'rir' ? 'RIR' : 'RPE'}
            </AppText>
          )}
          <View style={styles.colCheck} />
          {ACCIONES_VISIBLES && editable ? <View style={anchas ? styles.colAcciones : styles.colMasEspacio} /> : null}
        </View>
      ) : null}

      {/* Mantener presionado el número de la serie y arrastrar la cambia de lugar (RF-F33). */}
      <ReorderableColumn
        items={sets}
        keyOf={(s) => s.id}
        enabled={editable && sets.length > 1}
        gap={Spacing.xs}
        onMove={(from, to) => props.onMoveSet(exercise, from, to)}
        onDragStateChange={props.onDragStateChange}
        renderItem={(set, i, drag) => (
          <FilaSerie
            {...props}
            set={set}
            etiqueta={etiquetas[i]}
            anterior={previous[i] ?? null}
            prsSerie={prs.get(set.id)}
            pendiente={pendientes.has(set.id)}
            drag={drag}
          />
        )}
      />

      {editable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={b.addSetTo(nombre)}
          onPress={() => props.onAddSet(exercise)}
          style={({ pressed }) => [styles.agregar, { borderColor: theme.border }, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
          <Plus size={IconSize.inline} strokeWidth={IconStroke} color={theme.text} />
          <AppText variant="label">{b.set}</AppText>
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
  drag: DragControls;
};

function FilaSerie(p: FilaProps) {
  const theme = useTheme();
  const tx = useT();
  const lang = useLanguage();
  const b = tx.fitness.block;
  const swipe = useRef<SwipeableMethods>(null);
  const { set, exercise, columns, unit, effortScale, editable } = p;
  const anchas = useAccionesAnchas();
  const hecha = set.completed_at !== null;
  const esfuerzo = effortScale === 'rir' ? set.rir : set.rpe;
  const main = set.segments[0];
  const textoAnterior = p.anterior?.segments[0]
    ? formatSegment(p.anterior.segments[0], unit, lang)
    : set.target?.reps_min
      ? b.goal(`${set.target.reps_min}${set.target.reps_max && set.target.reps_max !== set.target.reps_min ? `–${set.target.reps_max}` : ''}`)
      : '–';
  /** Lo que la serie tiene de especial, en una línea: "Drop set · tempo 3-1-X-0 · fallo". */
  const detalle = [
    ...set.intensifiers.map((k) => intensifierLabel(k, lang)),
    set.tempo ? b.tempo(set.tempo) : null,
    set.failure ? b.failure : null,
    set.load_mods?.added_kg ? b.addedLoad(set.load_mods.added_kg) : null,
    set.spotter ? b.spotted : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const celda = (segmentIndex: number, field: SegmentField) => (
    <Pressable
      key={`${segmentIndex}-${field}`}
      accessibilityRole="button"
      accessibilityLabel={b.cellA11y(columnLabel(field, unit, lang), p.etiqueta, valorCelda(set, segmentIndex, field, unit))}
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

  const tieneNota = !!set.notes || set.tags.length > 0;

  const contenido = (
    <View style={[styles.serie, { backgroundColor: hecha ? theme.surfaceAlt : theme.surface }]}>
      <View style={styles.fila}>
        {p.drag.handle(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={b.setOptions(p.etiqueta)}
            accessibilityHint={editable ? b.dragHint : undefined}
            disabled={!editable}
            // Al soltar un arrastre no se abre el menú.
            onPress={() => (p.drag.justDragged() ? undefined : p.onSetMenu(exercise, set))}
            style={[styles.colNumero, styles.numero]}>
            <AppText variant="label" color={set.set_type === 'working' ? 'text' : 'textSecondary'}>
              {p.etiqueta}
            </AppText>
          </Pressable>,
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={p.anterior ? b.copyPrevious(textoAnterior) : b.noPrevious}
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
          accessibilityLabel={b.effortOf(effortScale === 'rir' ? 'RIR' : 'RPE', p.etiqueta)}
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
          accessibilityLabel={hecha ? b.uncheck(p.etiqueta) : b.markDone(p.etiqueta)}
          disabled={!editable}
          hitSlop={6}
          onPress={() => p.onToggle(exercise, set)}
          style={styles.colCheck}>
          <View style={[styles.check, hecha ? { backgroundColor: theme.ink, borderColor: theme.ink } : { borderColor: theme.border }]}>
            {hecha ? <Check size={16} strokeWidth={3} color={theme.onInk} /> : null}
          </View>
        </Pressable>

        {ACCIONES_VISIBLES && editable ? (
          anchas ? (
            <View style={styles.colAcciones}>
              <IconButton label={b.duplicateSet(p.etiqueta)} onPress={() => p.onDuplicate(exercise, set)}>
                <Copy size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
              </IconButton>
              <IconButton label={b.deleteSet(p.etiqueta)} onPress={() => p.onDelete(exercise, set)}>
                <Trash2 size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
              </IconButton>
            </View>
          ) : (
            // "⋮" de 20 px de ancho con `hitSlop` hasta 44: a 390 px un botón de 44 empujaba fuera el número.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={b.moreActions(p.etiqueta)}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              onPress={() => p.onSetMenu(exercise, set)}
              style={({ pressed }) => [styles.colMas, pressed ? { opacity: 0.6 } : null]}>
              <EllipsisVertical size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            </Pressable>
          )
        ) : null}
      </View>

      {set.segments.slice(1).map((seg, j) => (
        <View key={seg.id} style={styles.fila}>
          <View style={styles.colNumero} />
          {seg.kind === 'drop' && set.intensifiers.includes('mechanical_drop') ? (
            <TramoVariante {...p} seg={seg} indice={j + 1} />
          ) : (
            <AppText variant="caption" color="textSecondary" style={styles.colAnterior}>
              ↳ {segmentName(seg.kind, lang)}
            </AppText>
          )}
          {columns.map((c) => celda(j + 1, c))}
          <View style={styles.colCorta} />
          {editable ? (
            <IconButton label={b.remove(segmentName(seg.kind, lang))} onPress={() => p.onRemoveSegment(set, j + 1)}>
              <X size={IconSize.inline} strokeWidth={IconStroke} color={theme.textTertiary} />
            </IconButton>
          ) : (
            <View style={styles.colCheck} />
          )}
          {ACCIONES_VISIBLES && editable ? <View style={anchas ? styles.colAcciones : styles.colMasEspacio} /> : null}
        </View>
      ))}

      {(main?.partial_reps || main?.forced_reps || main?.cheat_reps || detalle || tieneNota || p.prsSerie || p.pendiente || (main && isImbalanced(main))) ? (
        <View style={styles.extras}>
          {tieneNota ? (
            <View style={styles.notaSerie} accessibilityLabel={b.setNote([set.notes, ...set.tags.map((g) => tagLabel(g, lang))].filter(Boolean).join(', '))}>
              <MessageSquareText size={12} strokeWidth={IconStroke} color={theme.textSecondary} />
              <AppText variant="micro" color="textSecondary">
                {[...set.tags.map((g) => tagLabel(g, lang)), set.notes].filter(Boolean).join(' · ')}
              </AppText>
            </View>
          ) : null}
          {detalle ? (
            <AppText variant="micro" color="textSecondary">
              {detalle}
            </AppText>
          ) : null}
          {main?.forced_reps ? (
            <AppText variant="micro" color="textSecondary">
              {b.forced(main.forced_reps)}
            </AppText>
          ) : null}
          {main?.cheat_reps ? (
            <AppText variant="micro" color="textSecondary">
              {b.cheat(main.cheat_reps)}
            </AppText>
          ) : null}
          {main?.partial_reps ? (
            <AppText variant="micro" color="textSecondary">
              {b.partials(main.partial_reps)}
            </AppText>
          ) : null}
          {main && isImbalanced(main) ? (
            <AppText variant="micro" color="today">
              {b.imbalance}
            </AppText>
          ) : null}
          {p.prsSerie ? (
            <Animated.View entering={p.celebrate ? ZoomIn.springify().damping(12) : undefined} style={[styles.pr, { backgroundColor: theme.ink }]}>
              <AppText variant="micro" color="onInk">
                {b.pr(p.prsSerie.map((k) => tx.training.prKinds[k]).join(' · '))}
              </AppText>
            </Animated.View>
          ) : null}
          {p.pendiente ? (
            <AppText variant="micro" color="textTertiary">
              {b.saving}
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
          <AppText variant="caption">{b.duplicate}</AppText>
        </View>
      )}
      renderRightActions={() => (
        <View style={[styles.accion, styles.accionDer, { backgroundColor: theme.danger }]}>
          <AppText variant="caption" color="onInk">
            {b.delete}
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

/** El tramo de un drop mecánico: muestra la variante y, si se puede editar, la elige. */
function TramoVariante(p: FilaProps & { seg: SetSegment; indice: number }) {
  const theme = useTheme();
  const b = useT().fitness.block;
  const nombre = p.seg.variant_exercise_id ? p.exerciseName?.(p.seg.variant_exercise_id) ?? b.variant : null;
  const puedeElegir = p.editable && !!p.onPickVariant;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nombre ? b.variantA11y(nombre) : b.pickVariantA11y}
      disabled={!puedeElegir}
      onPress={() => p.onPickVariant?.(p.set, p.indice)}
      style={({ pressed }) => [styles.colAnterior, styles.variante, pressed ? { backgroundColor: theme.surfaceAlt } : null]}>
      <AppText variant="caption" color={nombre ? 'text' : puedeElegir ? 'textSecondary' : 'textTertiary'} numberOfLines={2}>
        ↳ {nombre ?? (puedeElegir ? b.pickVariant : b.variantLower)}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grupo: { minWidth: 32, height: 26, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, borderCurve: 'continuous' },
  bloque: { padding: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, borderCurve: 'continuous', gap: Spacing.xs },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  titulo: { flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' },
  legado: { padding: Spacing.sm, borderRadius: Radius.sm, borderCurve: 'continuous' },
  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, paddingVertical: 2, paddingHorizontal: Spacing.xs, borderRadius: Radius.sm, borderCurve: 'continuous' },
  notaSerie: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  flex: { flex: 1 },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: Spacing.xs },
  serie: { borderRadius: Radius.sm, borderCurve: 'continuous', paddingVertical: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48 },
  colNumero: { width: 30, textAlign: 'center' },
  numero: { height: 44, alignItems: 'center', justifyContent: 'center' },
  colAnterior: { flex: 1, minWidth: 48 },
  colAncha: { width: 64, textAlign: 'center' },
  colCorta: { width: 46, textAlign: 'center' },
  colCheck: { width: 44, alignItems: 'center', justifyContent: 'center' },
  colAcciones: { width: 88, flexDirection: 'row', alignItems: 'center' },
  colMas: { width: 20, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  colMasEspacio: { width: 20 },
  celda: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.sm, borderCurve: 'continuous' },
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
  termino: { textAlign: 'center', textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
  variante: { minHeight: 44, justifyContent: 'center', borderRadius: Radius.sm, borderCurve: 'continuous' },
});
