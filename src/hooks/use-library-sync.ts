import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isOfflineError } from '@/lib/auth-errors';
import { confirmar, type EntradaDeLibreria, pendientes } from '@/lib/library/offline/outbox';
import { getCanvas, listAnnotations, removeAnnotationImage, removeAnnotations, removeCanvas, saveAnnotations, saveCanvas, saveReadingSession, updateLibraryItem } from '@/services/library';

/**
 * Sube lo que quedó en la cola de la librería (RF-BR3, T285): el avance y las anotaciones (T286). Lo que
 * falla por falta de red se queda y se reintenta solo: cada 10 s mientras haya pendientes, y al volver la
 * app al frente. Lo que el servidor rechaza por otra razón (el libro ya no existe) se descarta, para no
 * reintentarlo para siempre.
 *
 * El borrado de una imagen quitada (T333) espera su hora: antes se queda en la cola, y si para entonces la
 * anotación volvió a existir (se deshizo en otro aparato), no se borra.
 */
const REINTENTO_MS = 10_000;
let reintento: ReturnType<typeof setTimeout> | null = null;
let enCurso: Promise<void> | null = null;
let cuandoToque: ReturnType<typeof setTimeout> | null = null;

/** Para una espera que aún no vence: se queda en la cola. */
const AUN_NO = Symbol('aun-no');

async function borrarImagenQuitada(e: Extract<EntradaDeLibreria, { op: 'imageCleanup' }>): Promise<unknown> {
  if (Date.now() < e.due) return AUN_NO;
  if (e.canvasId) {
    // De un recorte (T342): si el recorte la volvió a poner, se queda; si el recorte ya no existe, se borra.
    const recorte = await getCanvas(e.canvasId).catch((error: unknown) => {
      if (isOfflineError(error)) throw error;
      return null;
    });
    if (recorte?.doc.elements.some((x) => x.id === e.id)) return null;
  } else if ((await listAnnotations(e.itemId)).some((a) => a.id === e.id)) return null;
  return removeAnnotationImage(e.userId, e.itemId, e.id);
}

function subir(e: EntradaDeLibreria): Promise<unknown> {
  switch (e.op) {
    case 'position':
      return updateLibraryItem(e.itemId, e.patch);
    case 'annotation':
      return saveAnnotations(e.userId, [e.annotation]);
    case 'annotationRemove':
      return removeAnnotations([e.id]);
    case 'session':
      return saveReadingSession(e.userId, e.session);
    case 'imageCleanup':
      return borrarImagenQuitada(e);
    case 'canvas':
      return saveCanvas(e.userId, e.canvas);
    case 'canvasRemove':
      return removeCanvas(e.id);
  }
}

export function subirPendientes(): Promise<void> {
  enCurso ??= (async () => {
    try {
      const entradas = await pendientes();
      const hechas = [];
      let sinRed = false;
      let proxima = Infinity;
      for (const e of entradas) {
        try {
          if ((await subir(e)) === AUN_NO) {
            proxima = Math.min(proxima, (e as { due: number }).due);
            continue;
          }
          hechas.push(e);
        } catch (error) {
          if (isOfflineError(error)) sinRed = true;
          else hechas.push(e);
        }
      }
      if (hechas.length) await confirmar(hechas);
      if (sinRed && !reintento) {
        reintento = setTimeout(() => {
          reintento = null;
          void subirPendientes();
        }, REINTENTO_MS);
      }
      // Si la app sigue abierta cuando vence una espera, se borra ahí mismo; si no, al volver.
      if (proxima < Infinity && !cuandoToque) {
        cuandoToque = setTimeout(
          () => {
            cuandoToque = null;
            void subirPendientes();
          },
          Math.max(1000, proxima - Date.now()),
        );
      }
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

/** Sube lo pendiente al entrar a la librería o al lector, y cada vez que la app vuelve al frente. */
export function useLibrarySync() {
  useEffect(() => {
    void subirPendientes();
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void subirPendientes();
    });
    return () => sub.remove();
  }, []);
}
