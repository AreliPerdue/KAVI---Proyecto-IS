/**
 * Barra de personas del calendario con muchos contactos (spec 06, RF-S15b). Lógica pura.
 */

/** Cuántos contactos caben en la barra antes del botón "···". */
export const MAX_PEOPLE_IN_BAR = 20;

export type PersonaDeBarra = { id: string; nombre: string; usuario: string };

/** Minúsculas y sin acentos, para ordenar y buscar como lo haría una persona. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** De la A a la Z por nombre, con el usuario como desempate. */
export function alfabetico<T extends PersonaDeBarra>(personas: readonly T[]): T[] {
  return [...personas].sort(
    (a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre), 'es') || a.usuario.localeCompare(b.usuario),
  );
}

/**
 * Quiénes van en la barra y en qué orden: primero los superpuestos más recientemente, luego
 * los que nunca se han superpuesto de la A a la Z, hasta `tope`. Quien está superpuesto ahora
 * siempre se ve, aunque pase del tope, porque esconderlo dejaría su color en el calendario sin
 * nombre que lo explique.
 *
 * @param recientes Última vez (ISO) que se superpuso a cada id.
 */
export function personasEnBarra<T extends PersonaDeBarra>(
  personas: readonly T[],
  recientes: Readonly<Record<string, string>>,
  superpuestos: readonly string[],
  tope: number = MAX_PEOPLE_IN_BAR,
): { visibles: T[]; hayMas: boolean } {
  const conFecha = personas.filter((p) => recientes[p.id]).sort((a, b) => (recientes[b.id] as string).localeCompare(recientes[a.id] as string));
  const sinFecha = alfabetico(personas.filter((p) => !recientes[p.id]));
  const ordenadas = [...conFecha, ...sinFecha];
  const visibles = ordenadas.slice(0, tope);
  for (const p of ordenadas.slice(tope)) if (superpuestos.includes(p.id)) visibles.push(p);
  return { visibles, hayMas: ordenadas.length > tope };
}

/** Filtro del buscador: por nombre o @usuario, sin distinguir acentos ni mayúsculas. */
export function buscarPersonas<T extends PersonaDeBarra>(personas: readonly T[], consulta: string): T[] {
  const q = normalizar(consulta).replace(/^@/, '');
  const todas = alfabetico(personas);
  if (!q) return todas;
  return todas.filter((p) => normalizar(p.nombre).includes(q) || normalizar(p.usuario).includes(q));
}
