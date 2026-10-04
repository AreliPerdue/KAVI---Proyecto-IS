import { addDays, eachDayOfInterval } from 'date-fns';

import { fromDayKey, toDayKey } from '@/lib/dates';
import { occursOn, parseRRule } from '@/lib/recurrence';
import type { KaviList, ListRun } from '@/types/domain';

/**
 * Hora del día siguiente a la que caduca una vuelta (RF-L20).
 *
 * No es medianoche a propósito: la gente palomea tarde, y cerrar al cambiar el día
 * registraría como incumplido algo que sí se hizo. Las 15:00 dan toda la mañana siguiente
 * para apuntar lo de ayer sin que la vuelta se quede abierta indefinidamente.
 */
export const HORA_CIERRE_VUELTA = 15;

/** Instante exacto en que una vuelta deja de poder editarse. */
export function finDeGracia(runDate: string): Date {
  const limite = addDays(fromDayKey(runDate), 1);
  limite.setHours(HORA_CIERRE_VUELTA, 0, 0, 0);
  return limite;
}

/**
 * ¿Esta vuelta ya caducó?
 *
 * Vive aquí y no dentro de cada backend porque es la regla que decide si algo cuenta como
 * hecho: que el demo y Supabase la calcularan por su cuenta es justo la clase de diferencia
 * que no se nota hasta que los números no cuadran.
 */
export function graciaVencida(runDate: string, ahora = new Date()): boolean {
  return ahora >= finDeGracia(runDate);
}

export type ResumenDeVueltas = {
  /** Vueltas en las que se completó todo. Es el número que encabeza el resumen. */
  completas: number;
  /** Vueltas registradas. Contexto, no denominador de una nota. */
  registradas: number;
  /** Promedio de elementos hechos por vuelta, redondeado a un decimal. */
  promedioHechos: number;
  /** Elementos que suele tener la rutina, para dar sentido al promedio. */
  promedioTotal: number;
};

/**
 * Resumen de cómo ha ido una rutina (RF-L21).
 *
 * **Cuenta lo hecho, nunca lo que falta.** Esta función existe tanto para calcular como
 * para dejar fijada esa decisión: el concepto de KAVI dice que la app no debe ejercer la
 * presión de la productividad tóxica, y esta es la única parte del producto que podría
 * hacerlo sin darse cuenta.
 *
 * Por eso no devuelve porcentaje de incumplimiento, ni racha, ni nada que se pueda romper.
 * Un número que se rompe convierte un mal día en una pérdida, y es exactamente el momento
 * en que la gente abandona la rutina **y** la app que se la recuerda.
 */
export function resumirVueltas(
  vueltas: readonly { completed_count: number; total_count: number }[],
): ResumenDeVueltas {
  const conElementos = vueltas.filter((v) => v.total_count > 0);
  if (conElementos.length === 0) {
    return { completas: 0, registradas: vueltas.length, promedioHechos: 0, promedioTotal: 0 };
  }
  const suma = (f: (v: { completed_count: number; total_count: number }) => number) =>
    conElementos.reduce((acc, v) => acc + f(v), 0);
  const redondear = (n: number) => Math.round(n * 10) / 10;
  return {
    completas: conElementos.filter((v) => v.completed_count >= v.total_count).length,
    registradas: vueltas.length,
    promedioHechos: redondear(suma((v) => v.completed_count) / conElementos.length),
    promedioTotal: redondear(suma((v) => v.total_count) / conElementos.length),
  };
}

/** Una rutina en uno de los días en que le toca, con lo que lleva hecho (RF-L26). */
export type RutinaDelDia = {
  list: KaviList;
  /** Día en `YYYY-MM-DD`. */
  day: string;
  hechos: number;
  total: number;
  /** Se hizo entera. Una rutina sin elementos nunca cuenta como completa: no había nada. */
  completa: boolean;
};

/**
 * En qué días de [from, to] cae cada rutina, y cuánto lleva cada uno.
 *
 * Los días se **calculan** con la regla y no se leen de las vueltas: la vuelta solo existe
 * desde que alguien abre la lista ese día, y el calendario tiene que mostrar el lunes que
 * viene aunque nadie lo haya abierto todavía. Las vueltas solo aportan el avance:
 *
 *  - abierta → lo palomeado hasta ahora contra los elementos actuales de la lista;
 *  - cerrada → los conteos que quedaron congelados al cerrarse (RF-L20);
 *  - sin vuelta → nada hecho todavía.
 */
export function rutinasEnRango(
  lists: readonly KaviList[],
  runs: readonly ListRun[],
  fromDate: string,
  toDate: string,
): RutinaDelDia[] {
  if (fromDate > toDate) return [];
  const dias = eachDayOfInterval({ start: fromDayKey(fromDate), end: fromDayKey(toDate) });
  const vueltaDe = new Map(runs.map((r) => [`${r.list_id}|${r.run_date}`, r]));
  const salida: RutinaDelDia[] = [];

  for (const list of lists) {
    const regla = parseRRule(list.recurrence_rule);
    if (!regla || !list.recurrence_start || list.is_archived) continue;
    for (const d of dias) {
      if (!occursOn(regla, list.recurrence_start, d)) continue;
      const day = toDayKey(d);
      const vuelta = vueltaDe.get(`${list.id}|${day}`);
      const total = vuelta?.closed_at ? vuelta.total_count : list.total_count;
      // Un elemento palomeado y luego borrado sigue en la vuelta: se acota para no pasar de 3/3.
      const hechos = Math.min(
        total,
        vuelta ? (vuelta.closed_at ? vuelta.completed_count : vuelta.completed_item_ids.length) : 0,
      );
      salida.push({ list, day, hechos, total, completa: total > 0 && hechos >= total });
    }
  }
  return salida;
}
