import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useEditHistory } from '@/hooks/use-edit-history';
import { libraryKeys } from '@/hooks/use-library';
import { subirPendientes } from '@/hooks/use-library-sync';
import { isOfflineError } from '@/lib/auth-errors';
import { aEntrada } from '@/lib/library/annotations';
import { aplicarAnotacionesPendientes, encolar, pendientes } from '@/lib/library/offline/outbox';
import { anotacionesGuardadas, guardarAnotaciones } from '@/lib/library/offline/snapshot';
import { useAuth } from '@/providers';
import { listAnnotations } from '@/services/library';
import type { LibraryAnnotation } from '@/types/domain';

/**
 * Lo anotado de un libro (spec 13c; T286). Cada vez que llega del servidor se guarda una copia en el
 * dispositivo y sin red se usa esa (RF-BR3); en los dos casos, con lo que la cola aún no sube encima.
 */
export function useAnnotations(itemId: string) {
  const { userId } = useAuth();
  return useQuery<LibraryAnnotation[]>({
    queryKey: libraryKeys.annotations(itemId),
    queryFn: async () => {
      const id = userId as string;
      try {
        const lista = await listAnnotations(itemId);
        void guardarAnotaciones(id, itemId, lista).catch(() => undefined);
        return aplicarAnotacionesPendientes(lista, await pendientes(), itemId);
      } catch (e) {
        const guardada = isOfflineError(e) ? await anotacionesGuardadas(id, itemId) : null;
        if (!guardada) throw e;
        return aplicarAnotacionesPendientes(guardada, await pendientes(), itemId);
      }
    },
    enabled: !!userId && !!itemId,
  });
}

/**
 * Guardar y quitar anotaciones: se ven al instante y van primero a la cola del dispositivo, que las sube
 * (sin red, al volver). Por eso aquí no hay errores que mostrar: nada se pierde.
 */
function useEscritor(itemId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const clave = libraryKeys.annotations(itemId);

  const guardar = useCallback(
    (a: LibraryAnnotation) => {
      queryClient.setQueryData<LibraryAnnotation[]>(clave, (lista = []) =>
        [...lista.filter((x) => x.id !== a.id), a].sort((x, y) => x.z - y.z),
      );
      void encolar({ op: 'annotation', itemId, userId: userId as string, annotation: aEntrada(a), at: Date.now() }).then(subirPendientes);
    },
    // `clave` sale de `itemId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, itemId, userId],
  );

  const quitar = useCallback(
    (a: Pick<LibraryAnnotation, 'id'>) => {
      queryClient.setQueryData<LibraryAnnotation[]>(clave, (lista = []) => lista.filter((x) => x.id !== a.id));
      void encolar({ op: 'annotationRemove', itemId, id: a.id, at: Date.now() }).then(subirPendientes);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, itemId],
  );

  return { guardar, quitar };
}

/**
 * Lo que se hace con lo anotado mientras se lee, con deshacer y rehacer (RF-BH18). Cada acción guarda cómo
 * revertirse con la fila completa de antes; la pila vive en el lector y se olvida al salir, como en el
 * logger del gym (RF-F40).
 */
export function useAnnotationEditor(itemId: string) {
  const { guardar, quitar } = useEscritor(itemId);
  const historia = useEditHistory();
  const { record } = historia;

  const crear = useCallback(
    (a: LibraryAnnotation) => {
      guardar(a);
      record({ undo: () => quitar(a), redo: () => guardar(a) });
    },
    [guardar, quitar, record],
  );

  const cambiar = useCallback(
    (antes: LibraryAnnotation, despues: LibraryAnnotation) => {
      guardar(despues);
      record({ undo: () => guardar(antes), redo: () => guardar(despues) });
    },
    [guardar, record],
  );

  const borrar = useCallback(
    (a: LibraryAnnotation) => {
      quitar(a);
      record({ undo: () => guardar(a), redo: () => quitar(a) });
    },
    [guardar, quitar, record],
  );

  return { crear, cambiar, borrar, deshacer: historia.undo, rehacer: historia.redo, puedeDeshacer: historia.canUndo, puedeRehacer: historia.canRedo };
}
