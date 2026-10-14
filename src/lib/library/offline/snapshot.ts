import { getJson, setJson, storage } from '@/lib/storage';
import type { LibraryAnnotation, LibraryItem } from '@/types/domain';

/**
 * La última lista de la librería que llegó del servidor, guardada en el dispositivo (spec 13b, RF-BR3;
 * T285). Sin red, la librería y el lector usan esta: así se ve qué hay y se abre lo que ya está en el
 * teléfono. Recuerda de quién es: si en el aparato entra otra cuenta, no la ve.
 *
 * Igual con las anotaciones de cada libro abierto (T286): sin red, el libro se lee con lo que tenía pegado.
 */

const KEY = 'kavi.library.items.v1';
const KEY_ANOTACIONES = 'kavi.library.annotations.v1';

type Guardada = { userId: string; items: readonly LibraryItem[] };
type AnotacionesGuardadas = { userId: string; porPieza: Record<string, readonly LibraryAnnotation[]> };

export function guardarLista(userId: string, items: readonly LibraryItem[]): Promise<void> {
  return setJson(KEY, { userId, items } satisfies Guardada);
}

export async function listaGuardada(userId: string): Promise<LibraryItem[] | null> {
  const guardada = await getJson<Guardada>(KEY);
  return guardada?.userId === userId ? [...guardada.items] : null;
}

/** Las anotaciones de un libro, al lado de las de los otros libros de la misma cuenta. */
export async function guardarAnotaciones(userId: string, itemId: string, anotaciones: readonly LibraryAnnotation[]): Promise<void> {
  const previas = await getJson<AnotacionesGuardadas>(KEY_ANOTACIONES);
  const porPieza = previas?.userId === userId ? previas.porPieza : {};
  await setJson(KEY_ANOTACIONES, { userId, porPieza: { ...porPieza, [itemId]: anotaciones } } satisfies AnotacionesGuardadas);
}

export async function anotacionesGuardadas(userId: string, itemId: string): Promise<LibraryAnnotation[] | null> {
  const guardadas = await getJson<AnotacionesGuardadas>(KEY_ANOTACIONES);
  const lista = guardadas?.userId === userId ? guardadas.porPieza[itemId] : undefined;
  return lista ? [...lista] : null;
}

/** Al eliminar la cuenta (RF-A12). */
export async function olvidarLista(): Promise<void> {
  await Promise.all([storage.removeItem(KEY), storage.removeItem(KEY_ANOTACIONES)]);
}
