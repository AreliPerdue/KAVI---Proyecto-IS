import { type DocumentoDeLienzo, documentoValido, type ElementoDeLienzo, type OrientacionDeLienzo } from '@/lib/library/canvas';

/**
 * Plantillas del lienzo creativo (spec 13h, RF-CC18 – RF-CC21; T344). Una plantilla es un punto de partida: un acomodo
 * de piezas en neutros que se **copia** al recorte nuevo; después todo se mueve, se borra o se cambia.
 *
 * El módulo libro de una plantilla puede apuntar a "este libro" (`ESTE_LIBRO`): al usarla, se vuelve el libro donde se
 * hace el recorte. Así "Reseña del libro" o una plantilla propia sirven para cualquier libro.
 */

export const ESTE_LIBRO = 'este-libro';

export type PlantillaDeLienzo = { id: string; nombre: string; orientacion: OrientacionDeLienzo; doc: DocumentoDeLienzo };

/**
 * El documento de un recorte nuevo hecho con una plantilla: ids nuevos para cada pieza y cada grupo (dos recortes de la
 * misma plantilla no comparten nada) y "este libro" vuelto el libro del recorte.
 */
export function usarPlantilla(doc: DocumentoDeLienzo, itemId: string, nuevoId: () => string): DocumentoDeLienzo {
  const grupos = new Map<string, string>();
  const grupo = (g: string | null) => (g ? (grupos.get(g) ?? grupos.set(g, nuevoId()).get(g) ?? null) : null);
  return documentoValido({
    ...doc,
    elements: doc.elements.map((e) => ({
      ...e,
      id: nuevoId(),
      group: grupo(e.group),
      content: e.type === 'book' && e.content.itemId === ESTE_LIBRO ? { ...e.content, itemId } : e.content,
    })),
  });
}

/**
 * Lo que se guarda de un recorte como plantilla (RF-CC20): el acomodo y el contenido de ejemplo, sin lo personal de ese
 * recorte. Las fotos de las polaroids quedan como huecos y las imágenes sueltas se quitan (son archivos de ese libro);
 * el libro del recorte pasa a ser "este libro".
 */
export function comoPlantilla(doc: DocumentoDeLienzo, itemId: string | null): DocumentoDeLienzo {
  const elements: ElementoDeLienzo[] = doc.elements
    .filter((e) => e.type !== 'image')
    .map((e) => {
      if (e.type === 'polaroid') return { ...e, content: { ...e.content, paths: (e.content.paths ?? []).map(() => '') } };
      if (e.type === 'book' && itemId && e.content.itemId === itemId) return { ...e, content: { ...e.content, itemId: ESTE_LIBRO } };
      return e;
    });
  return documentoValido({ ...doc, elements });
}
