import { buildCatalog } from '@/constants/exercise-catalog';
import { muscleGroupOf } from '@/lib/gym/muscles';
import type { Exercise } from '@/types/domain';

/** Lugar de cada ejercicio en el catálogo: dentro de una familia, el principal va primero. */
let orden: Map<string, number> | null = null;
const lugar = (slug: string) => {
  orden ??= new Map(buildCatalog().map((e, i) => [e.slug, i]));
  return orden.get(slug) ?? Number.MAX_SAFE_INTEGER;
};

/**
 * Variantes para un drop mecánico (spec 07 v2, RF-F44): mismo peso, otra variante del
 * ejercicio, normalmente más fácil (inclinado → plano → declinado con la misma barra).
 *
 * - Candidatas: mismo grupo muscular principal y misma mecánica (compuesto o aislado).
 * - Lo que más pesa es el **equipo**: el peso no cambia, así que la barra sigue siendo barra.
 *   Después, el patrón de movimiento, la familia y la lateralidad.
 * - Primero va lo mejor de cada familia (plano, declinado…) y luego el resto, para que la
 *   lista no se llene de variantes de una sola.
 */
export function suggestVariants(base: Exercise, all: readonly Exercise[], limit = 12): Exercise[] {
  const grupos = new Set(base.primary_muscles.map(muscleGroupOf).filter(Boolean));
  const equipo = new Set(base.equipment);
  const puntuadas: { e: Exercise; puntos: number }[] = [];
  for (const e of all) {
    if (e.id === base.id || e.archived_at) continue;
    if (!e.primary_muscles.some((m) => grupos.has(muscleGroupOf(m)))) continue;
    if (base.mechanic && e.mechanic && e.mechanic !== base.mechanic) continue;
    const mismoEquipo = e.equipment.some((q) => equipo.has(q));
    const mismoPatron = !!base.movement_pattern && e.movement_pattern === base.movement_pattern;
    // Sin equipo ni patrón en común no es una variante, es otro ejercicio.
    if (!mismoEquipo && !mismoPatron) continue;
    let puntos = 0;
    if (mismoEquipo) puntos += 4;
    if (mismoPatron) puntos += 2;
    if (base.family && e.family === base.family) puntos += 1;
    if (e.laterality === base.laterality) puntos += 1;
    puntuadas.push({ e, puntos });
  }
  const ordenadas = puntuadas.sort((a, b) => b.puntos - a.puntos || lugar(a.e.slug) - lugar(b.e.slug)).map((x) => x.e);
  const vistas = new Set<string>();
  const primeras: Exercise[] = [];
  const resto: Exercise[] = [];
  for (const e of ordenadas) {
    const familia = e.family ?? e.id;
    if (vistas.has(familia)) resto.push(e);
    else {
      vistas.add(familia);
      primeras.push(e);
    }
  }
  return [...primeras, ...resto].slice(0, limit);
}
