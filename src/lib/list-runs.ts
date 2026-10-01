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
