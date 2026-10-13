/**
 * Formas de leer (spec 13b, RF-BR5 – RF-BR8; T283, T284): scroll hacia abajo, páginas de lado o libro real
 * (la hoja se dobla, a pantalla completa). Sin React.
 */
export type FormaDeLeer = 'scroll' | 'paged' | 'book';
export const FORMAS_DE_LEER: readonly FormaDeLeer[] = ['scroll', 'paged', 'book'];
export const FORMA_POR_OMISION: FormaDeLeer = 'scroll';

/** Cuántos libros se recuerdan; de sobra, y así la preferencia no crece sin fin. */
export const MAX_FORMAS = 500;

export function formaValida(valor: unknown): FormaDeLeer {
  return FORMAS_DE_LEER.includes(valor as FormaDeLeer) ? (valor as FormaDeLeer) : FORMA_POR_OMISION;
}

/** Lo guardado en el dispositivo, sin lo que no sea una forma que exista hoy. */
export function formasValidas(valor: unknown): Record<string, FormaDeLeer> {
  if (!valor || typeof valor !== 'object') return {};
  const limpio: Record<string, FormaDeLeer> = {};
  for (const [id, forma] of Object.entries(valor as Record<string, unknown>)) {
    if (FORMAS_DE_LEER.includes(forma as FormaDeLeer)) limpio[id] = forma as FormaDeLeer;
  }
  return limpio;
}

/**
 * Recordar la forma de un libro (RF-BR8). La del omisión no se guarda: así solo ocupa lugar lo que la
 * persona cambió. Pasado el tope se olvidan los más viejos (los primeros en el objeto).
 */
export function recordarForma(formas: Record<string, FormaDeLeer>, id: string, forma: FormaDeLeer): Record<string, FormaDeLeer> {
  const { [id]: _anterior, ...resto } = formas;
  const siguiente = forma === FORMA_POR_OMISION ? resto : { ...resto, [id]: forma };
  const ids = Object.keys(siguiente);
  return ids.length > MAX_FORMAS ? Object.fromEntries(ids.slice(ids.length - MAX_FORMAS).map((k) => [k, siguiente[k]])) : siguiente;
}
