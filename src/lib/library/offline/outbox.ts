import { getJson, setJson, storage } from '@/lib/storage';
import type { LibraryAnnotation, LibraryAnnotationInput, LibraryItem, LibraryItemPatch, LibraryReadingSessionInput } from '@/types/domain';

/**
 * Cola local de KAVI Library (spec 13b, RF-BR3; T285): lo que se cambió leyendo sin red se guarda primero
 * aquí y sube al volver, como la cola de series del gym (RF-F17). Lleva el avance de lectura (dónde voy y
 * cuánto llevo), las anotaciones (T286): guardar una o quitarla, las sesiones de lectura (T318) y el
 * archivo de una imagen pegada que se quitó (T333): se borra una hora después si no se deshizo.
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
  | { op: 'annotationRemove'; itemId: string; id: string; at: number }
  /** Una sesión de lectura: se reescribe mientras dura, así que la última versión gana. */
  | { op: 'session'; itemId: string; userId: string; session: LibraryReadingSessionInput; at: number }
  /** El archivo de una imagen quitada: no se borra antes de `due` (ms), por si se deshace. */
  | { op: 'imageCleanup'; itemId: string; userId: string; id: string; due: number; at: number };

/** Una hora para deshacer antes de borrar el archivo de una imagen quitada (T333). */
export const ESPERA_PARA_BORRAR_IMAGEN_MS = 60 * 60 * 1000;

const claveDe = (e: EntradaDeLibreria) => {
  switch (e.op) {
    case 'position':
      return `position:${e.itemId}`;
    case 'session':
      return `session:${e.session.id}`;
    case 'annotation':
      return `annotation:${e.annotation.id}`;
    case 'annotationRemove':
      return `annotation:${e.id}`;
    case 'imageCleanup':
      return `imageCleanup:${e.id}`;
  }
};

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

/**
 * Agrega un cambio y reemplaza lo pendiente de ese mismo libro (o de esa misma anotación). Guardar otra vez
 * una anotación (deshacer el quitarla) cancela el borrado pendiente de su imagen.
 */
export function encolar(entrada: EntradaDeLibreria): Promise<void> {
  return enCadena(async () => {
    const actuales = (await getJson<EntradaDeLibreria[]>(KEY)) ?? [];
    const cancela = entrada.op === 'annotation' ? `imageCleanup:${entrada.annotation.id}` : null;
    await setJson(KEY, [...actuales.filter((e) => claveDe(e) !== claveDe(entrada) && claveDe(e) !== cancela), entrada]);
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
