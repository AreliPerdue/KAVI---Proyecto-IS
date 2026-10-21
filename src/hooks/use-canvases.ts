import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useEditHistory } from '@/hooks/use-edit-history';
import { libraryKeys } from '@/hooks/use-library';
import { subirPendientes } from '@/hooks/use-library-sync';
import { isOfflineError } from '@/lib/auth-errors';
import { uuidv4 } from '@/lib/gym/ids';
import { DOCUMENTO_VACIO, type DocumentoDeLienzo, type OrientacionDeLienzo } from '@/lib/library/canvas';
import { aplicarLienzosPendientes, encolar, ESPERA_PARA_BORRAR_IMAGEN_MS, pendientes } from '@/lib/library/offline/outbox';
import { useAuth } from '@/providers';
import { getCanvas, listCanvases } from '@/services/library';
import type { LibraryCanvas, LibraryCanvasInput } from '@/types/domain';

/** Cuánto se espera después del último cambio para guardar: arrastrar no manda una escritura por cuadro. */
const GUARDAR_MS = 600;

/** Los recortes de un libro (13h, RF-CC1; T351), con lo que la cola aún no sube encima. */
export function useCanvases(itemId: string) {
  const { userId } = useAuth();
  return useQuery<LibraryCanvas[]>({
    queryKey: libraryKeys.canvases(itemId),
    queryFn: async () => {
      const cola = await pendientes();
      try {
        return aplicarLienzosPendientes(await listCanvases(itemId), cola, itemId);
      } catch (e) {
        if (!isOfflineError(e)) throw e;
        return aplicarLienzosPendientes([], cola, itemId);
      }
    },
    enabled: !!userId && !!itemId,
  });
}

/**
 * Un lienzo. Si se hizo sin red y aún no sube, sale de la cola; si ya está en la lista de su libro, se abre con
 * ella sin esperar.
 */
export function useCanvas(canvasId: string, itemId: string) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useQuery<LibraryCanvas>({
    queryKey: libraryKeys.canvas(canvasId),
    queryFn: async () => {
      const cola = await pendientes();
      const deLaCola = () => aplicarLienzosPendientes([], cola, itemId).find((c) => c.id === canvasId);
      try {
        const [c] = aplicarLienzosPendientes([await getCanvas(canvasId)], cola, itemId);
        return c;
      } catch (e) {
        const pendiente = deLaCola();
        if (pendiente) return pendiente;
        throw e;
      }
    },
    enabled: !!userId && !!canvasId,
    initialData: () => queryClient.getQueryData<LibraryCanvas[]>(libraryKeys.canvases(itemId))?.find((c) => c.id === canvasId),
    // Lo que se edita vive en el editor: volver a pedirlo a media edición no debe pisarlo.
    staleTime: Infinity,
  });
}

/** Guarda un lienzo: se ve al instante en su libro y va a la cola, que lo sube (sin red, al volver). */
function useGuardarLienzo() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  return useCallback(
    (canvas: LibraryCanvasInput) => {
      const itemId = canvas.item_id ?? '';
      const fecha = new Date().toISOString();
      queryClient.setQueryData<LibraryCanvas[]>(libraryKeys.canvases(itemId), (lista = []) => {
        const previo = lista.find((c) => c.id === canvas.id);
        const nuevo: LibraryCanvas = { owner_id: userId as string, thumb_path: null, created_at: fecha, ...previo, ...canvas, updated_at: fecha };
        return [nuevo, ...lista.filter((c) => c.id !== canvas.id)].sort((a, b) => b.created_at.localeCompare(a.created_at));
      });
      void encolar({ op: 'canvas', itemId, userId: userId as string, canvas, at: Date.now() }).then(subirPendientes);
    },
    [queryClient, userId],
  );
}

/** Crear un recorte en blanco de un libro (RF-CC19): devuelve su id para abrirlo. */
export function useCreateCanvas() {
  const guardar = useGuardarLienzo();
  const queryClient = useQueryClient();
  return useCallback(
    (itemId: string, orientation: OrientacionDeLienzo, title = '') => {
      const canvas: LibraryCanvasInput = { id: uuidv4(), context: 'book', item_id: itemId, title, orientation, doc: DOCUMENTO_VACIO, version: 1 };
      guardar(canvas);
      queryClient.setQueryData(libraryKeys.canvas(canvas.id), queryClient.getQueryData<LibraryCanvas[]>(libraryKeys.canvases(itemId))?.find((c) => c.id === canvas.id));
      return canvas.id;
    },
    [guardar, queryClient],
  );
}

/**
 * Que el archivo de unas imágenes de un recorte se borre (T342): `espera` ms después (una hora si se quitaron
 * editando, por si se deshace; ya, si se borró el recorte entero).
 */
export function useLimpiarImagenesDeLienzo() {
  const { userId } = useAuth();
  return useCallback(
    (itemId: string, canvasId: string, ids: readonly string[], espera = ESPERA_PARA_BORRAR_IMAGEN_MS) => {
      if (!ids.length || !userId) return;
      const ahora = Date.now();
      void Promise.all(ids.map((id) => encolar({ op: 'imageCleanup', itemId, userId, id, canvasId, due: ahora + espera, at: ahora }))).then(subirPendientes);
    },
    [userId],
  );
}

/** Borrar un recorte (RF-CC23): sale de su libro al instante, va a la cola y sus imágenes se borran. */
export function useRemoveCanvas() {
  const queryClient = useQueryClient();
  const limpiar = useLimpiarImagenesDeLienzo();
  return useCallback(
    (canvas: Pick<LibraryCanvas, 'id' | 'item_id' | 'doc'>) => {
      const itemId = canvas.item_id ?? '';
      queryClient.setQueryData<LibraryCanvas[]>(libraryKeys.canvases(itemId), (lista = []) => lista.filter((c) => c.id !== canvas.id));
      queryClient.removeQueries({ queryKey: libraryKeys.canvas(canvas.id) });
      void encolar({ op: 'canvasRemove', itemId, id: canvas.id, at: Date.now() }).then(subirPendientes);
      limpiar(itemId, canvas.id, canvas.doc.elements.filter((e) => e.type === 'image').map((e) => e.id), 0);
    },
    [queryClient, limpiar],
  );
}

/**
 * Editar un lienzo (13h, RF-CC10; T351): el documento vive aquí mientras se edita, cada cambio se puede deshacer
 * y rehacer, y se guarda solo un momento después del último (al salir, de inmediato).
 */
export function useCanvasEditor(canvas: LibraryCanvas | undefined) {
  const guardar = useGuardarLienzo();
  const historia = useEditHistory();
  const { record } = historia;
  const [doc, setDoc] = useState<DocumentoDeLienzo>(canvas?.doc ?? DOCUMENTO_VACIO);
  const [titulo, setTitulo] = useState(canvas?.title ?? '');
  const actual = useRef(doc);
  const base = useRef(canvas);
  const version = useRef(canvas?.version ?? 1);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sucio = useRef(false);

  // Llega el lienzo (o cambia de uno a otro): se edita ese.
  const id = canvas?.id;
  useEffect(() => {
    if (!canvas) return;
    if (base.current?.id === canvas.id && sucio.current) return;
    base.current = canvas;
    version.current = canvas.version;
    actual.current = canvas.doc;
    setDoc(canvas.doc);
    setTitulo(canvas.title);
    // Solo al cambiar de lienzo: lo que llega del servidor del mismo no pisa lo que se está editando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const guardarYa = useCallback(() => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
    const b = base.current;
    if (!b || !sucio.current) return;
    sucio.current = false;
    version.current += 1;
    guardar({ id: b.id, context: b.context, item_id: b.item_id, title: b.title, orientation: b.orientation, doc: actual.current, version: version.current });
  }, [guardar]);

  const poner = useCallback(
    (nuevo: DocumentoDeLienzo) => {
      actual.current = nuevo;
      setDoc(nuevo);
      sucio.current = true;
      if (espera.current) clearTimeout(espera.current);
      espera.current = setTimeout(guardarYa, GUARDAR_MS);
    },
    [guardarYa],
  );

  /** Aplica un cambio al documento y lo deja para deshacer. Si no cambió nada, no hace nada. */
  const aplicar = useCallback(
    (cambio: (d: DocumentoDeLienzo) => DocumentoDeLienzo) => {
      const antes = actual.current;
      const despues = cambio(antes);
      if (despues === antes) return;
      poner(despues);
      record({ undo: () => poner(antes), redo: () => poner(despues) });
    },
    [poner, record],
  );

  /** Cambiar el nombre del recorte (no es un paso de deshacer: es del recorte, no de su contenido). */
  const renombrar = useCallback(
    (nuevo: string) => {
      const b = base.current;
      if (!b) return;
      const limpio = nuevo.trim().slice(0, 120);
      base.current = { ...b, title: limpio };
      setTitulo(limpio);
      sucio.current = true;
      guardarYa();
    },
    [guardarYa],
  );

  // Al salir del lienzo, lo pendiente se guarda ya.
  useEffect(() => guardarYa, [guardarYa]);

  return { doc, titulo, renombrar, aplicar, guardarYa, deshacer: historia.undo, rehacer: historia.redo, puedeDeshacer: historia.canUndo, puedeRehacer: historia.canRedo };
}
