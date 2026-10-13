import { getJson, setJson, storage } from '@/lib/storage';
import type { LibraryItem } from '@/types/domain';

/**
 * La última lista de la librería que llegó del servidor, guardada en el dispositivo (spec 13b, RF-BR3;
 * T285). Sin red, la librería y el lector usan esta: así se ve qué hay y se abre lo que ya está en el
 * teléfono. Recuerda de quién es: si en el aparato entra otra cuenta, no la ve.
 */

const KEY = 'kavi.library.items.v1';

type Guardada = { userId: string; items: readonly LibraryItem[] };

export function guardarLista(userId: string, items: readonly LibraryItem[]): Promise<void> {
  return setJson(KEY, { userId, items } satisfies Guardada);
}

export async function listaGuardada(userId: string): Promise<LibraryItem[] | null> {
  const guardada = await getJson<Guardada>(KEY);
  return guardada?.userId === userId ? [...guardada.items] : null;
}

/** Al eliminar la cuenta (RF-A12). */
export function olvidarLista(): Promise<void> {
  return storage.removeItem(KEY);
}
