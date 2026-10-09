import type { QueryClient } from '@tanstack/react-query';

/**
 * Todo lo que depende de con quién compartes, más lo de listas.
 *
 * Tocar un contacto no cambia solo la lista de contactos: al romper una conexión el
 * backend revoca los shares de calendario y de actividad y las copias de recordatorios
 * (trigger `connections_revoke_shares`), así que el calendario, la disponibilidad y las
 * invitaciones dejan de ser ciertos en el mismo instante. Vive en un único lugar para
 * que quien invalide —una mutación o un aviso de Realtime— no se deje nada fuera.
 */
const SHARED_DATA_KEYS = [
  ['connections'],
  ['activities'],
  ['shares'],
  ['reminders'],
  ['availability'],
  /*
   * Todo lo de listas cuelga de esta raíz: al palomear alguien un elemento cambian el
   * detalle, la cuenta de pendientes de su tarjeta, la franja del día y los vencidos.
   * Invalidar solo el detalle dejaría el resto mintiendo.
   */
  ['lists'],
] as const;

export function invalidateSharedData(queryClient: QueryClient): void {
  for (const queryKey of SHARED_DATA_KEYS) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

/**
 * Qué recargar según la tabla que avisó Realtime (T271).
 *
 * Antes cualquier aviso recargaba todo lo de arriba —contactos, actividades, invitaciones,
 * recordatorios, disponibilidad y listas—, incluido el eco de lo que uno mismo acababa de
 * hacer: agregar "pan" a una lista disparaba más de una docena de consultas y repintaba el
 * calendario en segundo plano mientras se escribía lo siguiente. Ahora cada tabla recarga lo
 * suyo, y lo que cambia con quién compartes (`connections`, `calendar_shares`) sigue
 * recargando todo, por la cascada que explica `SHARED_DATA_KEYS`.
 */
const POR_TABLA: Record<string, readonly (readonly string[])[]> = {
  activities: [['activities'], ['shares'], ['availability'], ['reminders']],
  activity_shares: [['activities'], ['shares'], ['availability']],
  reminders: [['reminders']],
  reminder_recipients: [['reminders']],
  lists: [['lists']],
  list_sections: [['lists']],
  list_items: [['lists']],
  list_shares: [['lists']],
};

/** Cuánto dura "acabo de cambiar mis listas": el eco de Realtime llega antes de eso. */
const ECO_MS = 2000;
let ultimoCambioLocal = 0;

/** Lo llaman las mutaciones de listas al terminar: su propia recarga ya va en camino. */
export function anotarCambioLocalDeListas(): void {
  ultimoCambioLocal = Date.now();
}

const esDeListas = (table: string) => POR_TABLA[table]?.length === 1 && POR_TABLA[table]?.[0]?.[0] === 'lists';

export function invalidateForTables(queryClient: QueryClient, tables: ReadonlySet<string | undefined>): void {
  // Sin saber la tabla (el demo, un aviso genérico) o si cambió con quién compartes: todo.
  if ([...tables].some((t) => !t || !POR_TABLA[t])) return invalidateSharedData(queryClient);
  const claves = new Map<string, readonly string[]>();
  for (const t of tables as ReadonlySet<string>) {
    // El eco de un cambio propio de hace un instante: su recarga ya la hizo la mutación.
    if (esDeListas(t) && Date.now() - ultimoCambioLocal < ECO_MS) continue;
    for (const k of POR_TABLA[t] ?? []) claves.set(k.join('/'), k);
  }
  for (const queryKey of claves.values()) void queryClient.invalidateQueries({ queryKey });
}
