import type { NumpadField } from '@/components/fitness/numpad-sheet';
import { columnLabel, type EditTarget } from '@/components/fitness/exercise-block';
import { getLanguage, type Language, t } from '@/i18n';
import { segmentFieldValue, setSegmentField, type SegmentField } from '@/lib/gym/sets';
import type { EffortScale } from '@/store/gym-store';
import type { WeightUnit, WorkoutSet } from '@/types/domain';

/**
 * Lo que comparten el logger y el borrador del formulario de actividad (RF-F9, RF-F28):
 * qué muestra el teclado para cada celda, cómo se aplica lo que se escribe y a qué campo
 * se pasa después. Un solo lugar, para que registrar se sienta igual en los dos.
 */

/** El teclado para una celda. `prefijo` dice dónde se está: "Banca · serie 2". */
export function numpadFieldFor(
  target: EditTarget,
  draft: WorkoutSet,
  prefijo: string,
  effortScale: EffortScale,
  unit: WeightUnit,
  lang: Language = getLanguage(),
): NumpadField {
  const n = t(lang).fitness.workout.numpad;
  if (target.field === 'effort') {
    const rir = effortScale === 'rir';
    return { title: `${prefijo} · ${rir ? 'RIR' : 'RPE'}`, value: rir ? draft.rir : draft.rpe, step: rir ? 1 : 0.5, decimals: !rir, min: rir ? 0 : 1, max: 10 };
  }
  const seg = draft.segments[target.segmentIndex];
  const valor = seg ? segmentFieldValue(seg, target.field, unit) : null;
  switch (target.field) {
    case 'weight_kg':
      return { title: `${prefijo} · ${n.weight}`, value: valor, step: unit === 'kg' ? 2.5 : 5, decimals: true, suffix: unit };
    case 'duration_sec':
      return { title: `${prefijo} · ${n.time}`, value: valor, step: 15, decimals: false, suffix: 's' };
    case 'distance_m':
      return { title: `${prefijo} · ${n.distance}`, value: valor, step: 100, decimals: false, suffix: 'm' };
    case 'partial_reps':
      return { title: `${prefijo} · ${n.partials}`, value: valor, step: 1, decimals: false, counter: true };
    case 'forced_reps':
      return { title: `${prefijo} · ${n.forced}`, value: valor, step: 1, decimals: false, counter: true };
    case 'cheat_reps':
      return { title: `${prefijo} · ${n.cheat}`, value: valor, step: 1, decimals: false, counter: true };
    default:
      return { title: `${prefijo} · ${columnLabel(target.field, unit, lang)}`, value: valor, step: 1, decimals: false, counter: true, max: 999 };
  }
}

/** Escribe en la copia de trabajo lo que se tecleó. */
export function applyNumpadValue(draft: WorkoutSet, target: EditTarget, valor: number | null, effortScale: EffortScale, unit: WeightUnit): WorkoutSet {
  return target.field === 'effort' ? { ...draft, [effortScale]: valor } : setSegmentField(draft, target.segmentIndex, target.field, valor, unit);
}

/** Peso → reps → esfuerzo, y luego se cierra (`null`). Los tramos extra no avanzan. */
export function nextNumpadTarget(target: EditTarget, columns: readonly SegmentField[]): EditTarget | null {
  const orden: (SegmentField | 'effort')[] = [...columns, 'effort'];
  const i = orden.indexOf(target.field);
  const proximo = orden[i + 1];
  if (!proximo || target.segmentIndex > 0 || i < 0) return null;
  return { ...target, field: proximo };
}
