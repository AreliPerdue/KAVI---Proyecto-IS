/**
 * Nombres de ejercicio del más usado al menos; a igual uso, alfabético (RF-F4).
 *
 * Vive aquí y no en un backend para que demo y Supabase ordenen igual: en v1 el demo
 * ordenaba por uso y Supabase alfabéticamente, y el autocompletado se comportaba distinto
 * según dónde corriera la app.
 */
export function ordenarPorUso(nombres: Iterable<string>): string[] {
  const conteo = new Map<string, number>();
  for (const n of nombres) {
    const limpio = n.trim();
    if (limpio) conteo.set(limpio, (conteo.get(limpio) ?? 0) + 1);
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([nombre]) => nombre);
}
