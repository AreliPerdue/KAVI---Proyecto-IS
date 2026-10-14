import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isOfflineError } from '@/lib/auth-errors';
import { confirmar, type EntradaDeLibreria, pendientes } from '@/lib/library/offline/outbox';
import { removeAnnotations, saveAnnotations, updateLibraryItem } from '@/services/library';

/**
 * Sube lo que quedó en la cola de la librería (RF-BR3, T285): el avance y las anotaciones (T286). Lo que
 * falla por falta de red se queda y se reintenta solo: cada 10 s mientras haya pendientes, y al volver la
 * app al frente. Lo que el servidor rechaza por otra razón (el libro ya no existe) se descarta, para no
 * reintentarlo para siempre.
 */
const REINTENTO_MS = 10_000;
let reintento: ReturnType<typeof setTimeout> | null = null;
let enCurso: Promise<void> | null = null;

function subir(e: EntradaDeLibreria): Promise<unknown> {
  switch (e.op) {
    case 'position':
      return updateLibraryItem(e.itemId, e.patch);
    case 'annotation':
      return saveAnnotations(e.userId, [e.annotation]);
    case 'annotationRemove':
      return removeAnnotations([e.id]);
  }
}

export function subirPendientes(): Promise<void> {
  enCurso ??= (async () => {
    try {
      const entradas = await pendientes();
      const hechas = [];
      let sinRed = false;
      for (const e of entradas) {
        try {
          await subir(e);
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
