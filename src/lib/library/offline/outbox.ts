import { getJson, setJson, storage } from '@/lib/storage';
import type { LibraryAnnotation, LibraryAnnotationInput, LibraryItem, LibraryItemPatch } from '@/types/domain';

/**
 * Cola local de KAVI Library (spec 13b, RF-BR3; T285): lo que se cambió leyendo sin red se guarda primero
 * aquí y sube al volver, como la cola de series del gym (RF-F17). Lleva el avance de lectura (dónde voy y
 * cuánto llevo) y las anotaciones (T286): guardar una o quitarla.
 *
 * Una entrada por libro en el avance y una por anotación: el último cambio gana. Guardar y quitar la misma
 * anotación comparten lugar, así quitar lo que aún no subía no deja una creación pendiente.
 */

const KEY = 'kavi.library.outbox.v1';

export type PatchDeAvance = Pick<LibraryItemPatch, 'last_position' | 'progress'>;
export type EntradaDeLibreria =
  | { op: 'position'; itemId: string; patch: PatchDeAvance; at: number }
  /** La anotación completa: subirla dos veces da lo mismo (se guarda por id). */
  | { op: 'annotation'; itemId: string; userId: string; annotation: LibraryAnnotationInput; at: number }
  | { op: 'annotationRemove'; itemId: string; id: string; at: number };

const claveDe = (e: EntradaDeLibreria) =>
  e.op === 'position' ? `position:${e.itemId}` : `annotation:${e.op === 'annotation' ? e.annotation.id : e.id}`;

/** Las escrituras van en fila para que dos cambios seguidos no se pisen al guardar. */
let cadena: Promise<unknown> = Promise.resolve();
function enCadena<T>(fn: () => Promise<T>): Promise<T> {
  const r = cadena.then(fn, fn);
  cadena = r.catch(() => undefined);
  return r;
}

export function pendientes(): Promise<EntradaDeLibreria[]> {
  return enCadena(async () => (await getJson<EntradaDeLibreria[]>(KEY)) ?? []);
}

/** Agrega un cambio y reemplaza lo pendiente de ese mismo libro (o de esa misma anotación). */
export function encolar(entrada: EntradaDeLibreria): Promise<void> {
  return enCadena(async () => {
    const actuales = (await getJson<EntradaDeLibreria[]>(KEY)) ?? [];
    await setJson(KEY, [...actuales.filter((e) => claveDe(e) !== claveDe(entrada)), entrada]);
  });
}

/** Quita lo que el servidor ya confirmó, salvo que haya llegado algo más nuevo mientras se mandaba. */
export function confirmar(enviadas: readonly EntradaDeLibreria[]): Promise<void> {
  return enCadena(async () => {
    const hechas = new Map(enviadas.map((e) => [claveDe(e), e.at]));
    const actuales = (await getJson<EntradaDeLibreria[]>(KEY)) ?? [];
    await setJson(KEY, actuales.filter((e) => hechas.get(claveDe(e)) !== e.at));
  });
}

/** Lo pendiente encima de lo que dice el servidor (o la copia guardada): así se abre donde se quedó. */
export function aplicarPendientes<T extends Pick<LibraryItem, 'id'>>(items: readonly T[], entradas: readonly EntradaDeLibreria[]): T[] {
  const avance = new Map<string, PatchDeAvance>();
  for (const e of entradas) if (e.op === 'position') avance.set(e.itemId, e.patch);
  if (!avance.size) return [...items];
  return items.map((i) => (avance.has(i.id) ? { ...i, ...avance.get(i.id) } : i));
}

/**
 * Las anotaciones de un libro con lo que la cola aún no sube: lo guardado sin red se ve y lo quitado no
 * vuelve a aparecer. Una anotación nueva que solo está en la cola toma su dueño y sus fechas de ahí.
 */
export function aplicarAnotacionesPendientes(lista: readonly LibraryAnnotation[], entradas: readonly EntradaDeLibreria[], itemId: string): LibraryAnnotation[] {
  const porId = new Map(lista.map((a) => [a.id, a]));
  for (const e of entradas) {
    if (e.itemId !== itemId) continue;
    if (e.op === 'annotationRemove') porId.delete(e.id);
    else if (e.op === 'annotation') {
      const previa = porId.get(e.annotation.id);
      const fecha = new Date(e.at).toISOString();
      porId.set(e.annotation.id, {
        owner_id: e.userId,
        created_at: fecha,
        content: {},
        z: 0,
        removed: false,
        locked: false,
        ...previa,
        ...e.annotation,
        updated_at: fecha,
      });
    }
  }
  return [...porId.values()].sort((a, b) => a.z - b.z);
}

/** Al eliminar la cuenta no queda nada suyo en el dispositivo (RF-A12). */
export function vaciarCola(): Promise<void> {
  return enCadena(() => storage.removeItem(KEY));
}
