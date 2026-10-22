import { useCallback } from 'react';

import type { FuentesDeMiniatura } from '@/components/library/canvas-preview';
import { useFuentesDeLienzos } from '@/hooks/use-canvas-sources';
import { useCanvases, useCreateCanvas } from '@/hooks/use-canvases';
import type { DocumentoDeLienzo } from '@/lib/library/canvas';
import { type Cara, CARAS, portadaValida, tapasDe } from '@/lib/library/journal';
import type { LibraryCanvas, LibraryItem } from '@/types/domain';

export type DecoracionDeCara = { doc: DocumentoDeLienzo; fuentes: FuentesDeMiniatura } | null;

/**
 * Lo decorado en cada cara de un Journal (13i, RF-JC10; T346), listo para pintarlo sobre su material: en la librería,
 * en el librero y en su pantalla. Sale de la misma lista que sus páginas.
 */
export function useDecoracionDeJournal(journalId: string | null): Record<Cara, DecoracionDeCara> {
  const lienzos = useCanvases(journalId ?? '');
  const tapas = tapasDe(lienzos.data ?? []);
  const fuentes = useFuentesDeLienzos(CARAS.flatMap((c) => tapas[c]?.doc.elements ?? [])).miniatura;
  const de = (c: Cara): DecoracionDeCara => {
    const tapa = tapas[c];
    return tapa ? { doc: tapa.doc, fuentes } : null;
  };
  return { front: de('front'), spine: de('spine'), back: de('back') };
}

/**
 * Decorar una cara: la tapa que ya tiene o una nueva en blanco (la primera vez), con la forma del Journal. Devuelve el
 * id del lienzo para abrirlo.
 */
export function useTapaParaDecorar() {
  const crear = useCreateCanvas();
  return useCallback(
    (journal: Pick<LibraryItem, 'id' | 'journal'>, lienzos: readonly LibraryCanvas[], cara: Cara) =>
      tapasDe(lienzos)[cara]?.id ?? crear(journal.id, portadaValida(journal.journal).orientation, '', undefined, 'cover', cara),
    [crear],
  );
}
