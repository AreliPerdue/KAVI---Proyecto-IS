import { getJson, setJson } from '@/lib/storage';
import type { WorkoutExerciseDetail, WorkoutSet } from '@/types/domain';

/** Lo mínimo de una sesión con series; así la cola no depende de la capa de servicios. */
type ConSeries = { id: string; exercises: WorkoutExerciseDetail[] };

/**
 * Cola local de la sesión activa (RF-F17 – RF-F19).
 *
 * Cada cambio a una serie se escribe **primero aquí**, en el almacenamiento del
 * dispositivo, y luego se manda al servidor. Así la pantalla nunca espera a la red, y si
 * la app se cierra a media sesión, al volver se recupera lo que quedó sin confirmar y se
 * reenvía. Reenviar no duplica: las series llevan id del cliente y el servidor hace upsert.
 *
 * Una entrada por serie: el último cambio gana. Mandar solo el estado final es más barato
 * que reproducir cada toque, y el resultado es el mismo.
 */

const KEY = 'kavi.gym.outbox.v1';

export type OutboxEntry =
  | { op: 'save'; workoutId: string; set: WorkoutSet; at: number }
  | { op: 'remove'; workoutId: string; setId: string; at: number };

const idDe = (e: OutboxEntry) => (e.op === 'save' ? e.set.id : e.setId);

/** Las escrituras se encadenan para que dos toques seguidos no se pisen al guardar. */
let cadena: Promise<unknown> = Promise.resolve();

function enCadena<T>(fn: () => Promise<T>): Promise<T> {
  const r = cadena.then(fn, fn);
  cadena = r.catch(() => undefined);
  return r;
}

export function loadOutbox(): Promise<OutboxEntry[]> {
  return enCadena(async () => (await getJson<OutboxEntry[]>(KEY)) ?? []);
}

/** Agrega un cambio; reemplaza lo pendiente de esa misma serie. */
export function enqueue(entry: OutboxEntry): Promise<void> {
  return enCadena(async () => {
    const actuales = (await getJson<OutboxEntry[]>(KEY)) ?? [];
    await setJson(KEY, [...actuales.filter((e) => idDe(e) !== idDe(entry)), entry]);
  });
}

/**
 * Quita lo que el servidor ya confirmó. Solo si no cambió mientras se enviaba: si llegó un
 * toque nuevo para esa serie durante el envío, su entrada es más reciente y se queda.
 */
export function acknowledge(sent: readonly OutboxEntry[]): Promise<void> {
  return enCadena(async () => {
    const confirmado = new Map(sent.map((e) => [idDe(e), e.at]));
    const actuales = (await getJson<OutboxEntry[]>(KEY)) ?? [];
    await setJson(KEY, actuales.filter((e) => confirmado.get(idDe(e)) !== e.at));
  });
}

/**
 * Aplica lo pendiente sobre lo que devolvió el servidor, para pintar la sesión como la
 * dejó la persona aunque el servidor todavía no lo sepa (por ejemplo, tras un cierre).
 */
export function applyOutbox<T extends ConSeries>(detail: T, entries: readonly OutboxEntry[]): T {
  const propias = entries.filter((e) => e.workoutId === detail.id);
  if (propias.length === 0) return detail;
  const borradas = new Set(propias.filter((e) => e.op === 'remove').map(idDe));
  const guardadas = new Map(propias.filter((e): e is Extract<OutboxEntry, { op: 'save' }> => e.op === 'save').map((e) => [e.set.id, e.set]));

  return {
    ...detail,
    exercises: detail.exercises.map((ex) => {
      const existentes = ex.workout_sets.filter((s) => !borradas.has(s.id)).map((s) => guardadas.get(s.id) ?? s);
      const nuevas = [...guardadas.values()].filter((s) => s.workout_exercise_id === ex.id && !ex.workout_sets.some((x) => x.id === s.id));
      return { ...ex, workout_sets: [...existentes, ...nuevas].sort((a, b) => a.sort_order - b.sort_order) };
    }),
  };
}
