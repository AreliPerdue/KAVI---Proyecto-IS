import { JournalCover } from '@/components/library/journal-cover';
import { useDecoracionDeJournal } from '@/hooks/use-journal-covers';
import type { PortadaDeJournal } from '@/lib/library/journal';

/**
 * Un Journal en la librería (13i; T345, T346): su portada del tamaño de un libro, o su lomo en el librero, con lo que
 * tenga decorado. Aparte de `BookCover` y `BookSpine` porque pide sus tapas: así los libros no las piden.
 */
export function JournalEnLibreria({ id, portada, cara, ancho, alto }: { id: string; portada: PortadaDeJournal; cara: 'front' | 'spine'; ancho: number; alto: number }) {
  const decoracion = useDecoracionDeJournal(id);
  return cara === 'spine' ? (
    <JournalCover portada={portada} cara="spine" ancho={ancho} alto={alto} decoracion={decoracion.spine} />
  ) : (
    <JournalCover portada={portada} ancho={ancho} alto={alto} comoLibro decoracion={decoracion.front} />
  );
}
