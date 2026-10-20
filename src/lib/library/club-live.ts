/**
 * Sesión en vivo de un club (spec 13f, RF-BC10 – RF-BC14; T309): quién dirige y a dónde se sigue. Sin React.
 * Cada quien calcula lo mismo con lo que ve en el canal, así no hace falta guardar nada.
 */
import type { PosicionEnVivo, PresenteEnVivo } from '@/types/domain';

/** Los que están en la sesión, del que lleva más tiempo al que llegó al último. */
export function enLaSesion(presentes: readonly PresenteEnVivo[]): PresenteEnVivo[] {
  return presentes.filter((p) => p.enSesion).sort((a, b) => a.desde - b.desde || a.id.localeCompare(b.id));
}

/**
 * Quién dirige: quien dice dirigir (si dos lo dicen a la vez, el que llegó primero). Si quien dirigía se fue, el
 * mando pasa a quien lleva más tiempo dentro (RF-BC14). Sin nadie en la sesión, no hay sesión.
 */
export function quienDirige(presentes: readonly PresenteEnVivo[]): PresenteEnVivo | null {
  const dentro = enLaSesion(presentes);
  return dentro.find((p) => p.dirige) ?? dentro[0] ?? null;
}

/**
 * Lo que se manda de la posición de quien dirige: en EPUB el CFI (cada quien puede tener otra letra o forma de
 * leer, así se queda en el mismo párrafo, RF-BC11); en PDF la página.
 */
export function posicionParaSeguir(pos: { page?: number; cfi?: string; fraction?: number }, esEpub: boolean): PosicionEnVivo | null {
  if (esEpub) return pos.cfi ? { cfi: pos.cfi } : typeof pos.fraction === 'number' ? { fraction: pos.fraction } : null;
  return pos.page ? { page: pos.page } : null;
}

/** Si dos posiciones son el mismo lugar (para no mandar ni mover de más). */
export const mismoLugar = (a: PosicionEnVivo | null, b: PosicionEnVivo | null) => !!a && !!b && a.page === b.page && a.cfi === b.cfi && a.fraction === b.fraction;
