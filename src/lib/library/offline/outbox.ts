import { getJson, setJson, storage } from '@/lib/storage';
import type { LibraryItem, LibraryItemPatch } from '@/types/domain';

/**
 * Cola local de KAVI Library (spec 13b, RF-BR3; T285): lo que se cambió leyendo sin red se guarda primero
 * aquí y sube al volver, como la cola de series del gym (RF-F17). Hoy lleva el avance de lectura (dónde
 * voy y cuánto llevo); las anotaciones de L3 entran aquí mismo con su propia operación.
 *
 * Una entrada por libro y operación: el último cambio gana. El avance solo importa el más reciente.
 */

const KEY = 'kavi.library.outbox.v1';

export type PatchDeAvance = Pick<LibraryItemPatch, 'last_position' | 'progress'>;
export type EntradaDeLibreria = { op: 'position'; itemId: string; patch: PatchDeAvance; at: number };

const claveDe = (e: EntradaDeLibreria) => `${e.op}:${e.itemId}`;

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

/** Agrega un cambio y reemplaza lo pendiente de ese mismo libro. */
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
  if (!entradas.length) return [...items];
  const avance = new Map(entradas.filter((e) => e.op === 'position').map((e) => [e.itemId, e.patch]));
  return items.map((i) => (avance.has(i.id) ? { ...i, ...avance.get(i.id) } : i));
}

/** Al eliminar la cuenta no queda nada suyo en el dispositivo (RF-A12). */
export function vaciarCola(): Promise<void> {
  return enCadena(() => storage.removeItem(KEY));
}
