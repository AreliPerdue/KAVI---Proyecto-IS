import { addDays } from 'date-fns';

import { fromDayKey } from '@/lib/dates';

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
