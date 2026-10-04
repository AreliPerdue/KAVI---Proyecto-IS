import { addWeeks, format, parseISO, startOfWeek } from 'date-fns';

import type { StreakEvent } from '@/types/domain';

/**
 * Racha de Hierro (RF-F58): semanas seguidas con al menos un entreno terminado.
 *
 * **No se pierde sola.** Una semana sin entreno no la pone en cero: la deja en pausa hasta
 * que la persona decide si sigue ("kept") o se reinicia ("reset"). Las semanas vacías
 * seguidas forman un solo hueco y se deciden juntas: tres semanas de vacaciones son una
 * pregunta, no tres.
 */

/** Lunes de la semana de `d`, en la zona local. */
export const weekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });
export const weekKey = (d: Date) => format(weekStart(d), 'yyyy-MM-dd');

/**
 * La racha nace con la función: los huecos que terminaron antes de esta semana cuentan como
 * reinicio y no se preguntan. Sin esto, quien ya tenía historial abriría Fitness con meses
 * de preguntas sobre semanas viejas.
 */
export const STREAK_SINCE = '2026-09-28';

export type StreakGap = {
  /** Lunes de cada semana del hueco, en orden. */
  weeks: string[];
};

export type StreakState = {
  /** Semanas que suma la racha. Si está en pausa, las de antes del hueco. */
  weeks: number;
  /** La racha más larga, para el logro (RF-F57). */
  best: number;
  /** El hueco que espera decisión; `null` si la racha no está en pausa. */
  paused: StreakGap | null;
  trainedThisWeek: boolean;
};

export function computeStreak(sessionDates: readonly Date[], events: readonly Pick<StreakEvent, 'week_start' | 'decision'>[], now: Date, since = STREAK_SINCE): StreakState {
  const entrenadas = new Set(sessionDates.map(weekKey));
  const actual = weekKey(now);
  const decision = new Map(events.map((e) => [e.week_start, e.decision]));
  const vacio: StreakState = { weeks: 0, best: 0, paused: null, trainedThisWeek: entrenadas.has(actual) };
  if (entrenadas.size === 0) return vacio;

  const primera = [...entrenadas].sort()[0];
  let semanas = 0;
  let mejor = 0;
  let w = parseISO(primera);
  while (format(w, 'yyyy-MM-dd') <= actual) {
    const clave = format(w, 'yyyy-MM-dd');
    if (entrenadas.has(clave)) {
      semanas += 1;
      mejor = Math.max(mejor, semanas);
      w = addWeeks(w, 1);
      continue;
    }
    // La semana en curso todavía no termina: no rompe ni pregunta.
    if (clave === actual) break;

    const hueco: string[] = [];
    while (format(w, 'yyyy-MM-dd') < actual && !entrenadas.has(format(w, 'yyyy-MM-dd'))) {
      hueco.push(format(w, 'yyyy-MM-dd'));
      w = addWeeks(w, 1);
    }
    if (hueco[hueco.length - 1] < since) {
      semanas = 0;
      continue;
    }
    if (hueco.some((s) => !decision.has(s))) {
      return { weeks: semanas, best: mejor, paused: { weeks: hueco }, trainedThisWeek: vacio.trainedThisWeek };
    }
    // La semana justificada no suma, pero tampoco rompe; "reiniciar" sí.
    if (hueco.some((s) => decision.get(s) === 'reset')) semanas = 0;
  }
  return { weeks: semanas, best: mejor, paused: null, trainedThisWeek: vacio.trainedThisWeek };
}
