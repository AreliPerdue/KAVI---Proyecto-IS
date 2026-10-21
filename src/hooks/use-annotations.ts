import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { useEditHistory } from '@/hooks/use-edit-history';
import { LIBRARY_URL_SECONDS } from '@/constants/library';
import { libraryKeys } from '@/hooks/use-library';
import { subirPendientes } from '@/hooks/use-library-sync';
import { isOfflineError } from '@/lib/auth-errors';
import { aEntrada, rutaDeImagen } from '@/lib/library/annotations';
import { aplicarAnotacionesPendientes, encolar, ESPERA_PARA_BORRAR_IMAGEN_MS, pendientes } from '@/lib/library/offline/outbox';
import { anotacionesGuardadas, guardarAnotaciones } from '@/lib/library/offline/snapshot';
import { useAuth } from '@/providers';
import { libraryFileUrl, listAnnotations, uploadAnnotationImage } from '@/services/library';
import { subscribeToClub } from '@/services/realtime';
import type { LibraryAnnotation } from '@/types/domain';

/**
 * Lo anotado de un libro (spec 13c; T286). Cada vez que llega del servidor se guarda una copia en el
 * dispositivo y sin red se usa esa (RF-BR3); en los dos casos, con lo que la cola aún no sube encima.
 * En una copia de club (13f, T307), también lo que anotaron los demás miembros en el club.
 */
export function useAnnotations(itemId: string, clubId?: string | null) {
  const { userId } = useAuth();
  return useQuery<LibraryAnnotation[]>({
    queryKey: [...libraryKeys.annotations(itemId), clubId ?? null],
    queryFn: async () => {
      const id = userId as string;
      try {
        const lista = await listAnnotations(itemId, clubId);
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
function useEscritor(itemId: string, clubId: string | null) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const clave = [...libraryKeys.annotations(itemId), clubId];

  const guardar = useCallback(
    (a: LibraryAnnotation) => {
      queryClient.setQueryData<LibraryAnnotation[]>(clave, (lista = []) =>
        [...lista.filter((x) => x.id !== a.id), a].sort((x, y) => x.z - y.z),
      );
      void encolar({ op: 'annotation', itemId, userId: userId as string, annotation: aEntrada(a), at: Date.now() }).then(subirPendientes);
    },
    // `clave` sale de `itemId` y `clubId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, itemId, userId, clubId],
  );

  const quitar = useCallback(
    (a: Pick<LibraryAnnotation, 'id' | 'kind'> & { owner_id?: string }) => {
      queryClient.setQueryData<LibraryAnnotation[]>(clave, (lista = []) => lista.filter((x) => x.id !== a.id));
      const ahora = Date.now();
      // El archivo de una imagen se queda una hora, por si se deshace; luego se borra (T333). La imagen de otro
      // miembro del club es suya: no se toca su archivo.
      const imagen = a.kind === 'image' && (!a.owner_id || a.owner_id === userId) ? encolar({ op: 'imageCleanup', itemId, userId: userId as string, id: a.id, due: ahora + ESPERA_PARA_BORRAR_IMAGEN_MS, at: ahora }) : null;
      void Promise.all([encolar({ op: 'annotationRemove', itemId, id: a.id, at: ahora }), imagen]).then(subirPendientes);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, itemId, userId, clubId],
  );

  return { guardar, quitar };
}

/**
 * Lo que se hace con lo anotado mientras se lee, con deshacer y rehacer (RF-BH18). Cada acción guarda cómo
 * revertirse con la fila completa de antes; la pila vive en el lector y se olvida al salir, como en el
 * logger del gym (RF-F40).
 */
export function useAnnotationEditor(itemId: string, club: { clubId: string | null; compartir: boolean } = { clubId: null, compartir: false }) {
  const { clubId, compartir } = club;
  const { guardar, quitar } = useEscritor(itemId, clubId);
  const historia = useEditHistory();
  const { record } = historia;

  // En una copia de club, lo nuevo es del club salvo que se anote "Solo para mí" (13f, RF-BC6; T307).
  const crear = useCallback(
    (nueva: LibraryAnnotation) => {
      const a = nueva.club_id !== undefined ? nueva : { ...nueva, club_id: clubId && compartir ? clubId : null };
      guardar(a);
      record({ undo: () => quitar(a), redo: () => guardar(a) });
    },
    [guardar, quitar, record, clubId, compartir],
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

  /** Quitar sin dejar paso para deshacer: algo que no llegó a existir (una imagen que no subió). */
  const descartar = quitar;

  return { crear, cambiar, borrar, descartar, deshacer: historia.undo, rehacer: historia.redo, puedeDeshacer: historia.canUndo, puedeRehacer: historia.canRedo };
}

/** Subir la imagen de una anotación (RF-BH12, T289) a la carpeta de la pieza. */
export function useUploadAnnotationImage() {
  const { userId } = useAuth();
  return (itemId: string, annotationId: string, jpeg: Uint8Array) => uploadAnnotationImage(userId as string, itemId, annotationId, jpeg);
}

/**
 * Las direcciones para ver las imágenes pegadas (T289): una firmada por imagen, renovada antes de que caduque,
 * como las portadas. Devuelve ruta → dirección.
 */
export function useAnnotationImageUrls(anotaciones: readonly LibraryAnnotation[] | undefined): ReadonlyMap<string, string> {
  return useLibraryImageUrls((anotaciones ?? []).filter((a) => a.kind === 'image' && !a.removed).map(rutaDeImagen));
}

/** Las direcciones firmadas de unas imágenes de Library por su ruta (también las del lienzo creativo, T351). */
export function useLibraryImageUrls(todas: readonly (string | null | undefined)[]): ReadonlyMap<string, string> {
  const rutas = [...new Set(todas.filter((r): r is string => !!r))];
  const urls = useQueries({
    queries: rutas.map((ruta) => ({
      queryKey: libraryKeys.url(ruta),
      queryFn: () => libraryFileUrl(ruta),
      staleTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      gcTime: (LIBRARY_URL_SECONDS - 300) * 1000,
      retry: 1,
    })),
  });
  // El mismo mapa mientras no cambie ninguna dirección: así el lector no le vuelve a mandar todo al motor.
  const clave = JSON.stringify(rutas.flatMap((ruta, i) => (urls[i]?.data ? [[ruta, urls[i].data as string]] : [])));
  return useMemo(() => new Map(JSON.parse(clave) as [string, string][]), [clave]);
}

/**
 * Mientras se lee una copia de club (13f, RF-BC6; T307): lo que anotan, cambian o quitan los demás llega solo.
 * Varios avisos seguidos se juntan en una recarga.
 */
export function useClubAnnotationsLive(itemId: string, clubId: string | null | undefined) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!clubId || !userId) return;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const quitar = subscribeToClub(clubId, userId, () => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => void queryClient.invalidateQueries({ queryKey: libraryKeys.annotations(itemId) }), 300);
    });
    return () => {
      if (espera) clearTimeout(espera);
      quitar();
    };
  }, [clubId, userId, itemId, queryClient]);
}
