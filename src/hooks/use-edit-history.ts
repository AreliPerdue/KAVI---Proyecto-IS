import { useCallback, useRef, useState } from 'react';

/** Un cambio que se sabe deshacer y rehacer. */
export type HistoryStep = { undo: () => void; redo: () => void };

const MAX_PASOS = 50;

/**
 * Deshacer y rehacer mientras se edita una sesión (RF-F40).
 *
 * Cada acción guarda cómo revertirse. Las que tocan varias series a la vez —unir, partir,
 * agregar el calentamiento— se registran como un solo paso con `batch`, porque para quien
 * edita fueron una sola cosa. La pila vive en la pantalla: al salir se olvida, igual que en
 * cualquier editor.
 */
export function useEditHistory() {
  const [pasado, setPasado] = useState<HistoryStep[]>([]);
  const [futuro, setFuturo] = useState<HistoryStep[]>([]);
  const lote = useRef<HistoryStep[] | null>(null);

  const record = useCallback((paso: HistoryStep) => {
    if (lote.current) {
      lote.current.push(paso);
      return;
    }
    setPasado((p) => [...p.slice(-(MAX_PASOS - 1)), paso]);
    setFuturo([]);
  }, []);

  const batch = useCallback(
    (fn: () => void) => {
      lote.current = [];
      try {
        fn();
      } finally {
        const pasos = lote.current;
        lote.current = null;
        if (pasos.length > 0) {
          record({
            undo: () => [...pasos].reverse().forEach((p) => p.undo()),
            redo: () => pasos.forEach((p) => p.redo()),
          });
        }
      }
    },
    [record],
  );

  const undo = () => {
    const paso = pasado[pasado.length - 1];
    if (!paso) return;
    paso.undo();
    setPasado(pasado.slice(0, -1));
    setFuturo([...futuro, paso]);
  };

  const redo = () => {
    const paso = futuro[futuro.length - 1];
    if (!paso) return;
    paso.redo();
    setFuturo(futuro.slice(0, -1));
    setPasado([...pasado, paso]);
  };

  return { record, batch, undo, redo, canUndo: pasado.length > 0, canRedo: futuro.length > 0 };
}
